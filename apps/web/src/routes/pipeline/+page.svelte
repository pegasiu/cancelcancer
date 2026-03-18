<script lang="ts">
  const steps = [
    {
      id: 'variant_calling',
      label: 'Mutation Discovery',
      agent: 'Mutation Hunter',
      color: '#ff6b6b',
      icon: '🔬',
      description: 'Scans tumor genomes from TCGA using ensemble variant calling (Mutect2 + Strelka2 + VarScan2) to identify somatic mutations.',
      tools: ['GATK Mutect2', 'Strelka2', 'VarScan2', 'Clara Parabricks'],
      compute: 'VAST.ai A100 or GDC API (pre-computed)',
    },
    {
      id: 'neoantigen_prediction',
      label: 'Neoantigen Screening',
      agent: 'Neoantigen Scout',
      color: '#4ecdc4',
      icon: '🎯',
      description: 'Predicts which mutations produce neoantigens visible to the immune system using peptide-MHC binding prediction.',
      tools: ['pVACseq', 'NetMHCpan 4.1', 'MHCflurry', 'NeoDesign'],
      compute: 'Railway CPU',
    },
    {
      id: 'structure_prediction',
      label: 'Protein Structure',
      agent: 'Structure Prophet',
      color: '#45b7d1',
      icon: '🔮',
      description: 'Predicts 3D structures of neoantigen peptide-MHC complexes to validate binding stability.',
      tools: ['AlphaFold 3', 'Boltz-2', 'ESMFold'],
      compute: 'VAST.ai A100/L40S',
    },
    {
      id: 'mrna_design',
      label: 'mRNA Vaccine Design',
      agent: 'mRNA Architect',
      color: '#96f2d7',
      icon: '🧬',
      description: 'Designs optimized mRNA sequences encoding selected neoantigens with maximum stability and immunogenicity.',
      tools: ['LinearDesign', 'mRNAid', 'ViennaRNA'],
      compute: 'Railway CPU',
    },
    {
      id: 'molecular_docking',
      label: 'Drug Simulation',
      agent: 'Drug Simulator',
      color: '#dda0dd',
      icon: '💊',
      description: 'Validates vaccine candidates through molecular docking and binding affinity simulations.',
      tools: ['DiffDock', 'RFdiffusion'],
      compute: 'VAST.ai L40S',
    },
  ];
</script>

<div class="page">
  <h1>Research Pipeline</h1>
  <p class="subtitle">
    From raw tumor DNA to mRNA vaccine candidate — 5 autonomous steps powered by AI agents.
  </p>

  <div class="pipeline">
    {#each steps as step, i}
      <div class="step" style:--step-color={step.color}>
        <div class="step-number">{i + 1}</div>
        <div class="step-content">
          <div class="step-header">
            <span class="step-icon">{step.icon}</span>
            <h2>{step.label}</h2>
            <span class="agent-badge">{step.agent}</span>
          </div>
          <p class="step-desc">{step.description}</p>
          <div class="step-meta">
            <div class="meta-group">
              <span class="meta-label">Tools:</span>
              {#each step.tools as tool}
                <span class="tool-tag">{tool}</span>
              {/each}
            </div>
            <div class="meta-group">
              <span class="meta-label">Compute:</span>
              <span class="compute-tag">{step.compute}</span>
            </div>
          </div>
        </div>
        {#if i < steps.length - 1}
          <div class="connector"></div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .page {
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .subtitle {
    color: var(--color-text-muted);
    margin-bottom: 40px;
    font-size: 1.05rem;
  }

  .pipeline {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .step {
    position: relative;
    display: flex;
    gap: 20px;
    padding-bottom: 32px;
  }

  .step-number {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--step-color) 20%, transparent);
    color: var(--step-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-family: var(--font-mono);
    font-size: 1rem;
    position: relative;
    z-index: 2;
  }

  .step-content {
    flex: 1;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 20px;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .step-icon {
    font-size: 1.3rem;
  }

  .step-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    flex: 1;
  }

  .agent-badge {
    background: color-mix(in srgb, var(--step-color) 15%, transparent);
    color: var(--step-color);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 9999px;
  }

  .step-desc {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .step-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meta-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .meta-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tool-tag {
    font-size: 0.75rem;
    background: var(--color-bg-elevated);
    color: var(--color-text);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
  }

  .compute-tag {
    font-size: 0.75rem;
    background: var(--color-accent-dim);
    color: var(--color-accent);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
  }

  .connector {
    position: absolute;
    left: 19px;
    top: 40px;
    bottom: 0;
    width: 2px;
    background: var(--color-border);
    z-index: 1;
  }
</style>
