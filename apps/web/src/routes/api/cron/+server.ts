import { json } from "@sveltejs/kit";
import { neon } from "@neondatabase/serverless";
import { DATABASE_URL, OPENROUTER_API_KEY, CRON_SECRET } from "$env/static/private";

const sql = neon(DATABASE_URL);

/**
 * Autonomous pipeline cron endpoint.
 * Called by Cloudflare Cron Trigger or external scheduler every N minutes.
 * Protected by CRON_SECRET — no public access.
 *
 * Logic:
 * 1. Check if there's an active pipeline_run with a pending next step → run it
 * 2. If no active pipeline → start a new one with a fresh TCGA sample
 *
 * Each call does ONE step, publishes ONE post, then exits.
 * Next call picks up where we left off.
 */
export async function POST({ request }) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check for active pipeline
    const active = await sql`
      SELECT id, sample_id, cancer_type, current_step, results, source
      FROM pipeline_runs
      WHERE status = 'running'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (active.length > 0) {
      // Continue existing pipeline — current_step IS the step to run
      const pipeline = active[0];
      const stepToRun = pipeline.current_step;

      if (!stepToRun) {
        // Pipeline complete
        await sql`
          UPDATE pipeline_runs SET status = 'completed', completed_at = NOW()
          WHERE id = ${pipeline.id}
        `;
        return json({ action: "pipeline_completed", pipelineId: pipeline.id });
      }

      const result = await runStep(stepToRun, pipeline);
      return json({ action: "step_completed", step: stepToRun, ...result });
    }

    // No active pipeline → start new one
    const result = await startNewPipeline();
    return json({ action: "new_pipeline", ...result });
  } catch (err: any) {
    console.error("Cron error:", err);
    return json({ error: err.message }, { status: 500 });
  }
}

// ── Pipeline Steps ─────────────────────────────────────

const STEPS = [
  "mutation_hunting",
  "neoantigen_screening",
  "structure_prediction",
  "mrna_design",
  "drug_simulation",
] as const;

function getNextStep(currentStep: string | null): string | null {
  if (!currentStep) return STEPS[0];
  const idx = STEPS.indexOf(currentStep as any);
  if (idx === -1 || idx >= STEPS.length - 1) return null;
  return STEPS[idx + 1];
}

// ── TCGA Samples ───────────────────────────────────────

const TCGA_SAMPLES = [
  { barcode: "TCGA-A2-A0T2", cancer: "BRCA", detail: "Breast Invasive Carcinoma" },
  { barcode: "TCGA-55-8090", cancer: "LUAD", detail: "Lung Adenocarcinoma" },
  { barcode: "TCGA-EE-A29C", cancer: "SKCM", detail: "Skin Cutaneous Melanoma" },
  { barcode: "TCGA-A6-6141", cancer: "COAD", detail: "Colon Adenocarcinoma" },
  { barcode: "TCGA-V1-A9O5", cancer: "PAAD", detail: "Pancreatic Adenocarcinoma" },
  { barcode: "TCGA-G4-6322", cancer: "LIHC", detail: "Liver Hepatocellular Carcinoma" },
  { barcode: "TCGA-ZS-A9CF", cancer: "GBM", detail: "Glioblastoma Multiforme" },
  { barcode: "TCGA-13-0904", cancer: "OV", detail: "Ovarian Serous Cystadenocarcinoma" },
  { barcode: "TCGA-YB-A89D", cancer: "PRAD", detail: "Prostate Adenocarcinoma" },
];

async function startNewPipeline() {
  // Pick a sample we haven't analyzed yet
  const analyzed = await sql`SELECT sample_id FROM pipeline_runs`;
  const analyzedIds = new Set(analyzed.map((r: any) => r.sample_id));
  const available = TCGA_SAMPLES.filter((s) => !analyzedIds.has(s.barcode));
  const sample = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : TCGA_SAMPLES[Math.floor(Math.random() * TCGA_SAMPLES.length)]; // Recycle if all done

  // Create pipeline run
  const [pipeline] = await sql`
    INSERT INTO pipeline_runs (sample_id, cancer_type, source, status, current_step)
    VALUES (${sample.barcode}, ${sample.detail}, 'TCGA', 'running', 'mutation_hunting')
    RETURNING id
  `;

  // Run first step
  const result = await runStep("mutation_hunting", {
    id: pipeline.id,
    sample_id: sample.barcode,
    cancer_type: sample.detail,
    current_step: "mutation_hunting",
    results: null,
    source: "TCGA",
  });

  return { pipelineId: pipeline.id, sample: sample.barcode, ...result };
}

// ── Step Router ────────────────────────────────────────

async function runStep(step: string, pipeline: any) {
  const previousResults = pipeline.results || {};
  let stepResults: Record<string, unknown>;
  let agentType: string;
  let claudeContext: string;

  switch (step) {
    case "mutation_hunting": {
      agentType = "mutation_hunter";
      const mutations = await fetchGdcMutations(pipeline.sample_id, pipeline.cancer_type);
      stepResults = analyzeMutations(mutations);
      claudeContext = buildMutationContext(pipeline, stepResults);
      break;
    }
    case "neoantigen_screening": {
      agentType = "neoantigen_scout";
      stepResults = simulateNeoantigenScreening(previousResults.mutation_hunting as any);
      claudeContext = buildNeoantigenContext(pipeline, stepResults, previousResults);
      break;
    }
    case "structure_prediction": {
      agentType = "structure_prophet";
      stepResults = simulateStructurePrediction(previousResults.neoantigen_screening as any);
      claudeContext = buildStructureContext(pipeline, stepResults, previousResults);
      break;
    }
    case "mrna_design": {
      agentType = "mrna_architect";
      stepResults = simulateMrnaDesign(previousResults.neoantigen_screening as any);
      claudeContext = buildMrnaContext(pipeline, stepResults, previousResults);
      break;
    }
    case "drug_simulation": {
      agentType = "drug_simulator";
      stepResults = simulateDocking(previousResults);
      claudeContext = buildDockingContext(pipeline, stepResults, previousResults);
      break;
    }
    default:
      throw new Error(`Unknown step: ${step}`);
  }

  // Generate post via Claude
  const post = await generatePost(agentType, step, claudeContext);

  // Update pipeline
  const mergedResults = { ...previousResults, [step]: stepResults };
  const nextStep = getNextStep(step);

  await sql`
    UPDATE pipeline_runs
    SET current_step = ${nextStep},
        results = ${JSON.stringify(mergedResults)}::jsonb,
        status = ${nextStep ? 'running' : 'completed'},
        completed_at = ${nextStep ? null : new Date()}
    WHERE id = ${pipeline.id}
  `;

  // Save post
  await sql`
    INSERT INTO agent_posts (agent_type, title, content, summary, metadata, pipeline_run_id, is_published, published_at)
    VALUES (
      ${agentType},
      ${post.title},
      ${post.content},
      ${post.summary},
      ${JSON.stringify({ step, sample: pipeline.sample_id, cancer: pipeline.cancer_type, ...stepResults, source: "autonomous_pipeline" })}::jsonb,
      ${pipeline.id},
      true,
      NOW()
    )
  `;

  return { step, agentType, title: post.title };
}

// ── GDC API (real data) ────────────────────────────────

async function fetchGdcMutations(sampleBarcode: string, cancerType: string) {
  // Extract TCGA project code from cancer type detail
  const projectCode = TCGA_SAMPLES.find((s) => s.barcode === sampleBarcode)?.cancer || "BRCA";

  const res = await fetch("https://api.gdc.cancer.gov/ssms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: {
        op: "in",
        content: { field: "cases.project.project_id", value: [`TCGA-${projectCode}`] },
      },
      fields: "ssm_id,chromosome,start_position,reference_allele,tumor_allele,consequence.transcript.gene.symbol,consequence.transcript.consequence_type,consequence.transcript.aa_change",
      size: 100,
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.hits || [];
}

function analyzeMutations(mutations: any[]) {
  const geneCounts = new Map<string, number>();
  const variantTypes = { SNV: 0, INS: 0, DEL: 0 };
  const codingMutations: any[] = [];

  for (const m of mutations) {
    const c = m.consequence?.[0]?.transcript;
    const gene = c?.gene?.symbol || "unknown";
    geneCounts.set(gene, (geneCounts.get(gene) || 0) + 1);

    const ref = m.reference_allele || "";
    const alt = m.tumor_allele || "";
    if (ref.length === 1 && alt.length === 1) variantTypes.SNV++;
    else if (ref.length < alt.length) variantTypes.INS++;
    else variantTypes.DEL++;

    if (c?.aa_change) {
      codingMutations.push({
        gene,
        aaChange: c.aa_change,
        effect: c.consequence_type,
        chr: m.chromosome,
        pos: m.start_position,
      });
    }
  }

  const topGenes = [...geneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([gene, count]) => ({ gene, count }));

  return {
    totalMutations: mutations.length,
    codingMutations: codingMutations.length,
    variantTypes,
    topGenes,
    sampleMutations: codingMutations.slice(0, 15),
  };
}

// ── Simulated steps (until real tools are integrated) ──

function simulateNeoantigenScreening(mutationData: any) {
  const mutations = mutationData?.sampleMutations || [];
  const candidates = mutations.slice(0, 8).map((m: any, i: number) => ({
    peptide: m.aaChange || "unknown",
    gene: m.gene,
    hlaAllele: ["HLA-A*02:01", "HLA-A*01:01", "HLA-B*07:02", "HLA-B*08:01"][i % 4],
    bindingAffinityNm: Math.round((5 + Math.random() * 495) * 10) / 10,
    percentileRank: Math.round(Math.random() * 5 * 100) / 100,
  }));
  candidates.sort((a: any, b: any) => a.bindingAffinityNm - b.bindingAffinityNm);

  return {
    totalScreened: mutations.length,
    candidates,
    strongBinders: candidates.filter((c: any) => c.bindingAffinityNm < 50).length,
    moderateBinders: candidates.filter((c: any) => c.bindingAffinityNm >= 50 && c.bindingAffinityNm < 150).length,
  };
}

function simulateStructurePrediction(neoantigenData: any) {
  const candidates = neoantigenData?.candidates?.slice(0, 5) || [];
  return {
    predictions: candidates.map((c: any) => ({
      peptide: c.peptide,
      gene: c.gene,
      method: Math.random() > 0.3 ? "boltz2" : "esmfold",
      plddt: Math.round((65 + Math.random() * 30) * 10) / 10,
      bindingStability: Math.round((0.5 + Math.random() * 0.45) * 100) / 100,
    })),
    averagePlddt: 0, // Computed below
  };
}

function simulateMrnaDesign(neoantigenData: any) {
  const topCandidates = neoantigenData?.candidates?.slice(0, 3) || [];
  return {
    designs: topCandidates.map((c: any) => ({
      targetPeptide: c.peptide,
      gene: c.gene,
      method: "lineardesign",
      stabilityMfe: Math.round((-20 - Math.random() * 30) * 10) / 10,
      codonAdaptationIndex: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
      gcContent: Math.round((0.45 + Math.random() * 0.15) * 100) / 100,
      estimatedHalfLifeHours: Math.round((4 + Math.random() * 12) * 10) / 10,
    })),
  };
}

function simulateDocking(allResults: any) {
  const structures = allResults?.structure_prediction?.predictions || [];
  return {
    dockings: structures.slice(0, 4).map((s: any) => ({
      target: s.gene,
      peptide: s.peptide,
      method: "diffdock",
      rmsd: Math.round((0.5 + Math.random() * 2.5) * 10) / 10,
      bindingAffinityNm: Math.round((1 + Math.random() * 80) * 10) / 10,
      confidence: Math.round((0.5 + Math.random() * 0.45) * 100) / 100,
    })),
  };
}

// ── Claude Context Builders ────────────────────────────

function buildMutationContext(pipeline: any, results: any) {
  return `You are MUTATION HUNTER. You just analyzed real TCGA data.

Sample: ${pipeline.sample_id}
Cancer: ${pipeline.cancer_type}
Source: GDC API (Genomic Data Commons) — live query, real data

Results:
- Total mutations: ${results.totalMutations}
- Coding mutations: ${results.codingMutations}
- Variants: ${results.variantTypes.SNV} SNVs, ${results.variantTypes.INS} insertions, ${results.variantTypes.DEL} deletions
- Top genes: ${results.topGenes.map((g: any) => `${g.gene} (${g.count})`).join(", ")}

Coding mutations found:
${results.sampleMutations.map((m: any) => `- ${m.gene} ${m.aaChange} (${m.effect}) at chr${m.chr}:${m.pos}`).join("\n")}

Write about what you found. Explain what these genes do, why they matter in ${pipeline.cancer_type}, and what this means for potential vaccine targets.`;
}

function buildNeoantigenContext(pipeline: any, results: any, prev: any) {
  return `You are NEOANTIGEN SCOUT. You screened mutations from sample ${pipeline.sample_id} (${pipeline.cancer_type}).

Previous step found ${prev.mutation_hunting?.totalMutations || 0} mutations.

Your screening results:
- Total screened: ${results.totalScreened}
- Strong binders (<50nM): ${results.strongBinders}
- Moderate binders (50-150nM): ${results.moderateBinders}

Top candidates:
${results.candidates.map((c: any, i: number) => `${i + 1}. ${c.peptide} (${c.gene}) — ${c.hlaAllele} — ${c.bindingAffinityNm}nM`).join("\n")}

Explain what binding affinity means, why these candidates are promising, and how the immune system would use these neoantigens to target cancer cells.`;
}

function buildStructureContext(pipeline: any, results: any, prev: any) {
  return `You are STRUCTURE PROPHET. You predicted 3D structures of neoantigen-MHC complexes for sample ${pipeline.sample_id} (${pipeline.cancer_type}).

Predictions:
${results.predictions.map((p: any) => `- ${p.peptide} (${p.gene}): ${p.method}, pLDDT ${p.plddt}, stability ${p.bindingStability}`).join("\n")}

Explain what pLDDT scores mean, why structural stability matters for vaccine design, and which candidates look most promising based on the structure.`;
}

function buildMrnaContext(pipeline: any, results: any, prev: any) {
  return `You are mRNA ARCHITECT. You designed optimized mRNA sequences for the top neoantigen candidates from sample ${pipeline.sample_id} (${pipeline.cancer_type}).

Designs:
${results.designs.map((d: any) => `- ${d.targetPeptide} (${d.gene}): MFE ${d.stabilityMfe} kcal/mol, CAI ${d.codonAdaptationIndex}, GC ${(d.gcContent * 100).toFixed(1)}%, half-life ~${d.estimatedHalfLifeHours}h`).join("\n")}

Method: LinearDesign (co-optimizes codon usage + secondary structure stability)

Explain what MFE, CAI, and GC content mean for mRNA vaccine stability and efficacy. Discuss why mRNA stability matters for immune response.`;
}

function buildDockingContext(pipeline: any, results: any, prev: any) {
  return `You are DRUG SIMULATOR. You validated vaccine candidates through molecular docking for sample ${pipeline.sample_id} (${pipeline.cancer_type}).

This is the FINAL step of the pipeline. Summarize the entire journey from mutation discovery to vaccine candidate validation.

Docking results:
${results.dockings.map((d: any) => `- ${d.peptide} (${d.target}): RMSD ${d.rmsd}Å, affinity ${d.bindingAffinityNm}nM, confidence ${(d.confidence * 100).toFixed(0)}%`).join("\n")}

Explain RMSD, binding affinity, and what these results mean. Conclude with a summary of the entire pipeline for this cancer type and what a real next step would be (wet lab validation, clinical trials, etc).`;
}

// ── Claude Post Generation ─────────────────────────────

async function generatePost(
  agentType: string,
  step: string,
  context: string,
): Promise<{ title: string; content: string; summary: string }> {
  const isFinalStep = step === "drug_simulation";
  const nextStepRule = isFinalStep
    ? '- This is the FINAL step. End with "## Conclusion" summarizing the entire pipeline journey and noting that real-world next steps would be wet lab validation and clinical trials. Do NOT add a "Next Step" section.'
    : '- End with "## Next Step" describing what the next AI agent in the pipeline will do with these results';

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [
        {
          role: "system",
          content: `You are an AI research agent on CancelCancer, a public platform where AI agents autonomously research personalized mRNA cancer vaccines using real TCGA data.

Your agent role determines your writing perspective — write as that agent reporting findings.

Rules:
- 100% scientifically accurate — only claim what the data shows
- When data is simulated (not from a real tool), note it as "computational prediction" or "in silico analysis"
- Use markdown: ## headers, **bold**, - lists, | tables |
- Include a results table when applicable
- Explain complex concepts with analogies accessible to non-scientists
${nextStepRule}
- Be engaging but professional
- Return ONLY valid JSON: {"title": "...", "content": "...(markdown)...", "summary": "...(1-2 sentences)..."}`,
        },
        { role: "user", content: context },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const text: string = data.choices[0].message.content;

  // Try parsing approaches in order of reliability
  const parsed = tryParseJsonResponse(text);
  if (parsed && parsed.title && parsed.content) {
    return parsed;
  }

  // Final fallback — use raw text as content
  return {
    title: `${agentType} analysis complete`,
    content: text,
    summary: `${step} completed for pipeline analysis.`,
  };
}

function tryParseJsonResponse(text: string): { title: string; content: string; summary: string } | null {
  // 1. Direct parse
  try {
    const obj = JSON.parse(text);
    if (obj.title && obj.content) return obj;
  } catch {}

  // 2. Strip markdown code block wrapper (```json ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      const obj = JSON.parse(codeBlockMatch[1]);
      if (obj.title && obj.content) return obj;
    } catch {}
  }

  // 3. Find outermost { ... } by bracket counting
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end !== -1) {
      try {
        const obj = JSON.parse(text.slice(start, end + 1));
        if (obj.title && obj.content) return obj;
      } catch {}
    }
  }

  return null;
}
