import { vastai, GPU_PRESETS } from "../vastai/client";
import type { SomaticMutation } from "@cancelcancer/bio-types";

/**
 * Mutation Hunter Agent
 *
 * Pipeline: TCGA BAM → Parabricks Mutect2 (GPU) → VCF → parse mutations
 *
 * For TCGA data, we can also download pre-computed MAF files from GDC
 * as a faster alternative to running variant calling from scratch.
 */
export async function handleVariantCalling(input: {
  sampleId: string;
  pipelineRunId?: string;
}): Promise<Record<string, unknown>> {
  console.log(`🔬 Mutation Hunter: analyzing sample ${input.sampleId}`);

  // Strategy 1: Use pre-computed TCGA MAF files from GDC API (fast, free)
  // Strategy 2: Run Parabricks Mutect2 on VAST.ai (for custom data)

  // For now, we'll use GDC API to fetch pre-computed mutation data
  const mutations = await fetchTcgaMutations(input.sampleId);

  return {
    sampleId: input.sampleId,
    totalMutations: mutations.length,
    codingMutations: mutations.filter((m) => m.effect !== "intron_variant").length,
    topGenes: getTopMutatedGenes(mutations),
    mutations: mutations.slice(0, 100), // Store top 100
  };
}

/**
 * Fetch somatic mutations from GDC (Genomic Data Commons) API
 * Uses pre-computed MAF files — no GPU needed
 */
async function fetchTcgaMutations(sampleBarcode: string): Promise<SomaticMutation[]> {
  const GDC_API = "https://api.gdc.cancer.gov";

  // Query somatic mutations for this sample
  const res = await fetch(`${GDC_API}/ssms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: {
        op: "and",
        content: [
          {
            op: "in",
            content: {
              field: "cases.samples.submitter_id",
              value: [sampleBarcode],
            },
          },
        ],
      },
      fields: [
        "ssm_id",
        "chromosome",
        "start_position",
        "reference_allele",
        "tumor_allele",
        "consequence.transcript.gene.symbol",
        "consequence.transcript.consequence_type",
        "consequence.transcript.aa_change",
      ].join(","),
      size: 500,
    }),
  });

  if (!res.ok) {
    console.warn(`GDC API returned ${res.status} for sample ${sampleBarcode}`);
    return [];
  }

  const data = (await res.json()) as any;
  const hits = data.data?.hits || [];

  return hits.map((hit: any) => {
    const consequence = hit.consequence?.[0]?.transcript;
    return {
      chromosome: hit.chromosome,
      position: hit.start_position,
      referenceAllele: hit.reference_allele,
      alternateAllele: hit.tumor_allele,
      gene: consequence?.gene?.symbol || "unknown",
      variantType: inferVariantType(hit.reference_allele, hit.tumor_allele),
      variantAlleleFrequency: 0, // Not available from this endpoint
      callers: ["mutect2"], // TCGA default caller
      effect: consequence?.consequence_type || "unknown",
      aminoAcidChange: consequence?.aa_change,
    } satisfies SomaticMutation;
  });
}

function inferVariantType(ref: string, alt: string): "SNV" | "INS" | "DEL" {
  if (ref.length === 1 && alt.length === 1) return "SNV";
  if (ref.length < alt.length) return "INS";
  return "DEL";
}

function getTopMutatedGenes(mutations: SomaticMutation[]): string[] {
  const geneCounts = new Map<string, number>();
  for (const m of mutations) {
    geneCounts.set(m.gene, (geneCounts.get(m.gene) || 0) + 1);
  }
  return [...geneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([gene]) => gene);
}
