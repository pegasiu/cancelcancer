<script lang="ts">
  import { marked } from 'marked';

  const AGENT_MAP: Record<string, { label: string; color: string; icon: string }> = {
    mutation_hunter: { label: 'Mutation Hunter', color: '#ff6b6b', icon: '🔬' },
    neoantigen_scout: { label: 'Neoantigen Scout', color: '#4ecdc4', icon: '🎯' },
    structure_prophet: { label: 'Structure Prophet', color: '#45b7d1', icon: '🔮' },
    mrna_architect: { label: 'mRNA Architect', color: '#96f2d7', icon: '🧬' },
    drug_simulator: { label: 'Drug Simulator', color: '#dda0dd', icon: '💊' },
    publisher: { label: 'Publisher', color: '#ffd93d', icon: '📝' },
  };

  const PIPELINE_STEPS = [
    'mutation_hunter',
    'neoantigen_scout',
    'structure_prophet',
    'mrna_architect',
    'drug_simulator',
  ];

  let { data } = $props();

  let isRunning = $derived(data.pipeline.status === 'running');
  let nextStepIndex = $derived(data.posts.length);

  function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
</script>

<svelte:head>
  <title>{data.pipeline.cancer_type} Analysis — CancelCancer</title>
  <meta name="description" content="Full pipeline analysis of {data.pipeline.cancer_type} sample {data.pipeline.sample_id}" />
</svelte:head>

<div class="page">
  <a href="/" class="back-link">← Back to feed</a>

  <header class="pipeline-header">
    <div class="header-top">
      <h1>{data.pipeline.cancer_type}</h1>
      <span class="status-badge" class:running={isRunning} class:completed={!isRunning}>
        {#if isRunning}
          <span class="status-dot"></span> Running
        {:else}
          ✓ Completed
        {/if}
      </span>
    </div>
    <p class="meta">
      Sample <strong>{data.pipeline.sample_id}</strong> · {data.pipeline.source} · Started {formatTime(data.pipeline.created_at)}
    </p>
  </header>

  <div class="timeline">
    {#each data.posts as post, i}
      {@const agent = AGENT_MAP[post.agent_type] ?? { label: post.agent_type, color: '#888', icon: '?' }}
      <div class="step" style:--agent-color={agent.color} id="step-{i + 1}">
        <div class="step-rail">
          <div class="step-number">{i + 1}</div>
          {#if i < data.posts.length - 1 || isRunning}
            <div class="step-line"></div>
          {/if}
        </div>
        <div class="step-content">
          <div class="step-header">
            <span class="agent-badge">{agent.icon} {agent.label}</span>
            <time class="step-time">{formatTime(post.published_at)}</time>
          </div>
          <h2 class="step-title">{post.title}</h2>
          {#if post.summary}
            <p class="step-summary">{post.summary}</p>
          {/if}
          <div class="prose">
            {@html marked(post.content)}
          </div>
        </div>
      </div>
    {/each}

    {#if isRunning && nextStepIndex < PIPELINE_STEPS.length}
      {@const nextAgent = AGENT_MAP[PIPELINE_STEPS[nextStepIndex]] ?? { label: 'Next Agent', icon: '⏳' }}
      <div class="step pending">
        <div class="step-rail">
          <div class="step-number pending-number">
            {nextStepIndex + 1}
          </div>
        </div>
        <div class="step-content pending-content">
          <span class="pending-text">
            {nextAgent.icon} {nextAgent.label} is analyzing...
          </span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page {
    max-width: 860px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-block;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    margin-bottom: 24px;
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  .pipeline-header {
    margin-bottom: 40px;
  }

  .header-top {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
  }

  .status-badge {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    padding: 4px 12px;
    border-radius: 9999px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-badge.running {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .status-badge.completed {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: var(--color-accent);
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .meta {
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  .meta strong {
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }

  /* Timeline */
  .timeline {
    display: flex;
    flex-direction: column;
  }

  .step {
    display: flex;
    gap: 24px;
    position: relative;
  }

  .step-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 48px;
  }

  .step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--agent-color, var(--color-border));
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--agent-color, var(--color-text));
    flex-shrink: 0;
    z-index: 2;
  }

  .step-line {
    width: 2px;
    flex: 1;
    background: var(--color-border);
    min-height: 24px;
  }

  .step-content {
    flex: 1;
    padding-bottom: 40px;
  }

  .step-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .agent-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: color-mix(in srgb, var(--agent-color) 15%, transparent);
    color: var(--agent-color);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 9999px;
  }

  .step-time {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }

  .step-title {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 6px;
    line-height: 1.3;
  }

  .step-summary {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  /* Pending step */
  .pending .pending-number {
    border-style: dashed;
    border-color: var(--color-text-muted);
    color: var(--color-text-muted);
    animation: pulse 2s ease-in-out infinite;
  }

  .pending-content {
    padding-top: 8px;
  }

  .pending-text {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    animation: pulse 2s ease-in-out infinite;
  }

  /* Prose (markdown content) */
  .prose {
    color: var(--color-text);
    font-size: 0.95rem;
    line-height: 1.7;
  }

  .prose :global(h2) {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 24px 0 8px;
    color: var(--color-text);
  }

  .prose :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    margin: 20px 0 6px;
    color: var(--color-text);
  }

  .prose :global(p) {
    margin: 8px 0;
  }

  .prose :global(strong) {
    color: var(--color-text);
    font-weight: 600;
  }

  .prose :global(a) {
    color: var(--color-accent);
  }

  .prose :global(ul), .prose :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }

  .prose :global(li) {
    margin: 4px 0;
  }

  .prose :global(li::marker) {
    color: var(--color-text-muted);
  }

  .prose :global(blockquote) {
    border-left: 3px solid var(--color-accent);
    padding-left: 16px;
    margin: 12px 0;
    color: var(--color-text-muted);
  }

  .prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--color-bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .prose :global(pre) {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 16px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .prose :global(pre code) {
    background: none;
    padding: 0;
  }

  .prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 0.85rem;
  }

  .prose :global(th) {
    background: var(--color-bg-elevated);
    font-weight: 600;
    text-align: left;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  .prose :global(td) {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
  }

  .prose :global(tr:nth-child(even)) {
    background: color-mix(in srgb, var(--color-bg-elevated) 50%, transparent);
  }

  .prose :global(hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 20px 0;
  }
</style>
