<script lang="ts">
  import AgentPost from '$lib/components/AgentPost.svelte';

  const AGENT_MAP: Record<string, { label: string; color: string; icon: string }> = {
    mutation_hunter: { label: 'Mutation Hunter', color: '#ff6b6b', icon: '🔬' },
    neoantigen_scout: { label: 'Neoantigen Scout', color: '#4ecdc4', icon: '🎯' },
    structure_prophet: { label: 'Structure Prophet', color: '#45b7d1', icon: '🔮' },
    mrna_architect: { label: 'mRNA Architect', color: '#96f2d7', icon: '🧬' },
    drug_simulator: { label: 'Drug Simulator', color: '#dda0dd', icon: '💊' },
  };

  const STEP_ORDER = ['mutation_hunter', 'neoantigen_scout', 'structure_prophet', 'mrna_architect', 'drug_simulator'];

  let { data } = $props();

  let totalPosts = $derived(
    data.pipelines.reduce((sum: number, p: any) => sum + Number(p.post_count || 0), 0) + data.standalonePosts.length
  );

  function formatRelativeTime(dateString: string): string {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);
    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
</script>

<div class="page">
  <section class="hero">
    <h1>AI Agents Researching<br/><span class="accent">mRNA Cancer Vaccines</span></h1>
    <p class="hero-sub">
      Autonomous AI agents analyze real tumor genomes from TCGA, predict neoantigens, design mRNA vaccines,
      and publish their findings here — 100% open science, fully automated.
    </p>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">6</span>
        <span class="stat-label">AI Agents</span>
      </div>
      <div class="stat">
        <span class="stat-value">{data.pipelines.length}</span>
        <span class="stat-label">Analyses</span>
      </div>
      <div class="stat">
        <span class="stat-value">{totalPosts}</span>
        <span class="stat-label">Discoveries</span>
      </div>
    </div>
  </section>

  {#if data.pipelines.length > 0}
    <section class="feed">
      <div class="feed-header">
        <h2 class="section-title">Research Pipelines</h2>
        <span class="live-badge">
          <span class="live-dot"></span>
          Agents running
        </span>
      </div>

      {#each data.pipelines as pipeline}
        <a href="/pipeline/{pipeline.pipeline_id}" class="pipeline-card" class:running={pipeline.status === 'running'}>
          <div class="card-top">
            <span class="cancer-type">{pipeline.cancer_type}</span>
            <span class="status-pill" class:status-running={pipeline.status === 'running'} class:status-completed={pipeline.status === 'completed'}>
              {#if pipeline.status === 'running'}
                <span class="dot"></span> Running
              {:else}
                ✓ Complete
              {/if}
            </span>
          </div>

          <p class="sample-id">Sample {pipeline.sample_id}</p>

          <div class="progress-steps">
            {#each STEP_ORDER as step, i}
              {@const agent = AGENT_MAP[step]}
              {@const isDone = i < Number(pipeline.post_count)}
              {@const isCurrent = i === Number(pipeline.post_count) && pipeline.status === 'running'}
              <div class="progress-dot" class:done={isDone} class:current={isCurrent} style:--dot-color={agent.color} title={agent.label}>
                {#if isDone}
                  <span class="dot-check">✓</span>
                {:else if isCurrent}
                  <span class="dot-spinner"></span>
                {:else}
                  <span class="dot-num">{i + 1}</span>
                {/if}
              </div>
              {#if i < STEP_ORDER.length - 1}
                <div class="progress-line" class:done={isDone}></div>
              {/if}
            {/each}
          </div>

          {#if pipeline.latest_title}
            <div class="latest-post">
              <span class="latest-label">Latest:</span>
              <span class="latest-title">{pipeline.latest_title}</span>
            </div>
          {/if}

          <div class="card-footer">
            <span class="post-count">{pipeline.post_count} articles</span>
            {#if pipeline.latest_published}
              <span class="time">{formatRelativeTime(pipeline.latest_published)}</span>
            {/if}
          </div>
        </a>
      {/each}
    </section>
  {/if}

  {#if data.standalonePosts.length > 0}
    <section class="feed standalone">
      <h2 class="section-title">Earlier Discoveries</h2>
      {#each data.standalonePosts as post}
        <AgentPost post={{
          id: post.id,
          agentType: post.agent_type,
          title: post.title,
          summary: post.summary ?? '',
          content: post.content,
          publishedAt: post.published_at,
          metadata: post.metadata ?? {}
        }} />
      {/each}
    </section>
  {/if}
</div>

<style>
  .hero {
    text-align: center;
    padding: 48px 0 40px;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 16px;
  }

  .accent { color: var(--color-accent); }

  .hero-sub {
    color: var(--color-text-muted);
    font-size: 1.1rem;
    max-width: 640px;
    margin: 0 auto 32px;
  }

  .stats { display: flex; gap: 48px; justify-content: center; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-accent); font-family: var(--font-mono); }
  .stat-label { font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  .feed { margin-top: 16px; }
  .standalone { margin-top: 40px; }

  .feed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .section-title { font-size: 1.25rem; margin: 0 0 24px; }
  .feed-header .section-title { margin: 0; }

  .live-badge {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.75rem; font-family: var(--font-mono);
    color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.05em;
  }

  .live-dot {
    width: 8px; height: 8px; background: var(--color-accent);
    border-radius: 50%; animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Pipeline Card */
  .pipeline-card {
    display: block;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 16px;
    text-decoration: none;
    color: var(--color-text);
    transition: border-color 0.2s, transform 0.1s;
  }

  .pipeline-card:hover {
    border-color: var(--color-accent);
    transform: translateY(-1px);
    text-decoration: none;
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .cancer-type {
    font-size: 1.15rem;
    font-weight: 700;
  }

  .status-pill {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    padding: 3px 10px;
    border-radius: 9999px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .status-running {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .status-completed {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .dot {
    width: 6px; height: 6px; background: var(--color-accent);
    border-radius: 50%; animation: pulse 2s ease-in-out infinite;
  }

  .sample-id {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }

  /* Progress dots */
  .progress-steps {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 16px;
  }

  .progress-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .progress-dot.done {
    border-color: var(--dot-color);
    background: color-mix(in srgb, var(--dot-color) 20%, transparent);
    color: var(--dot-color);
  }

  .progress-dot.current {
    border-color: var(--dot-color);
    border-style: dashed;
    color: var(--dot-color);
  }

  .dot-check { font-size: 0.7rem; }

  .dot-spinner {
    width: 10px; height: 10px;
    border: 2px solid transparent;
    border-top-color: var(--dot-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .dot-num { font-weight: 600; }

  .progress-line {
    flex: 1;
    height: 2px;
    background: var(--color-border);
    min-width: 12px;
  }

  .progress-line.done {
    background: var(--color-accent);
  }

  .latest-post {
    font-size: 0.85rem;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .latest-label {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-right: 6px;
  }

  .latest-title {
    color: var(--color-text);
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .post-count {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-accent);
  }

  .time {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
</style>
