<script lang="ts">
  import AgentPost from '$lib/components/AgentPost.svelte';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  const AGENT_MAP: Record<string, { label: string; color: string; icon: string }> = {
    mutation_hunter: { label: 'Mutation Hunter', color: '#ff6b6b', icon: '🔬' },
    neoantigen_scout: { label: 'Neoantigen Scout', color: '#4ecdc4', icon: '🎯' },
    structure_prophet: { label: 'Structure Prophet', color: '#45b7d1', icon: '🔮' },
    mrna_architect: { label: 'mRNA Architect', color: '#96f2d7', icon: '🧬' },
    drug_simulator: { label: 'Drug Simulator', color: '#dda0dd', icon: '💊' },
  };

  const STEP_MAP: Record<string, { label: string; agent: string; description: string }> = {
    mutation_hunting: { label: 'Mutation Discovery', agent: 'mutation_hunter', description: 'Querying GDC API for somatic mutations in tumor genome...' },
    neoantigen_screening: { label: 'Neoantigen Screening', agent: 'neoantigen_scout', description: 'Running IEDB NetMHCpan binding predictions on mutation-derived peptides...' },
    structure_prediction: { label: 'Structure Prediction', agent: 'structure_prophet', description: 'Fetching AlphaFold protein structures from EBI database...' },
    mrna_design: { label: 'mRNA Vaccine Design', agent: 'mrna_architect', description: 'Computing codon-optimized mRNA sequences for top candidates...' },
    drug_simulation: { label: 'Target Validation', agent: 'drug_simulator', description: 'Analyzing AlphaFold structural confidence for vaccine target viability...' },
  };

  const STEP_ORDER = ['mutation_hunter', 'neoantigen_scout', 'structure_prophet', 'mrna_architect', 'drug_simulator'];

  let { data } = $props();

  // Auto-refresh every 30s
  onMount(() => {
    const interval = setInterval(() => invalidateAll(), 30_000);
    return () => clearInterval(interval);
  });

  let currentStep = $derived(data.activePipeline?.current_step ? STEP_MAP[data.activePipeline.current_step] : null);
  let currentAgent = $derived(currentStep ? AGENT_MAP[currentStep.agent] : null);

  function formatRelativeTime(dateString: string): string {
    const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffSeconds < 10) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
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
        <span class="stat-value">{data.stats?.samples_analyzed || 0}</span>
        <span class="stat-label">Cancers Analyzed</span>
      </div>
      <div class="stat">
        <span class="stat-value">{data.stats?.total_discoveries || 0}</span>
        <span class="stat-label">Discoveries</span>
      </div>
      <div class="stat">
        <span class="stat-value">{data.stats?.completed_pipelines || 0}</span>
        <span class="stat-label">Complete Pipelines</span>
      </div>
    </div>
  </section>

  <!-- LIVE STATUS BAR -->
  {#if data.activePipeline && currentStep && currentAgent}
    <section class="live-status">
      <div class="live-status-inner">
        <span class="live-pulse"></span>
        <span class="live-label">LIVE</span>
        <span class="live-icon">{currentAgent.icon}</span>
        <span class="live-text">
          <strong style="color: {currentAgent.color}">{currentAgent.label}</strong>
          analyzing <strong>{data.activePipeline.cancer_type}</strong>
          <span class="live-sample">({data.activePipeline.sample_id})</span>
        </span>
      </div>
      <p class="live-detail">{currentStep.description}</p>
    </section>
  {:else}
    <section class="live-status idle">
      <div class="live-status-inner">
        <span class="idle-dot"></span>
        <span class="live-label">IDLE</span>
        <span class="live-text">Waiting for next cron trigger (every 10 minutes)...</span>
      </div>
    </section>
  {/if}

  <!-- PIPELINE CARDS -->
  {#if data.pipelines.length > 0}
    <section class="feed">
      <div class="feed-header">
        <h2 class="section-title">Research Pipelines</h2>
      </div>

      {#each data.pipelines as pipeline}
        <a href="/pipeline/{pipeline.pipeline_id}" class="pipeline-card">
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
              {@const isDone = i < Number(pipeline.step_count)}
              {@const isCurrent = i === Number(pipeline.step_count) && pipeline.status === 'running'}
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
            <span class="post-count">{pipeline.step_count}/5 steps · {pipeline.total_posts} articles</span>
            {#if pipeline.latest_published}
              <span class="time">{formatRelativeTime(pipeline.latest_published)}</span>
            {/if}
          </div>
        </a>
      {/each}
    </section>
  {/if}

  <!-- ACTIVITY LOG -->
  <section class="activity">
    <h2 class="section-title">Activity Log</h2>
    <div class="activity-list">
      {#each data.recentActivity as event}
        {@const agent = AGENT_MAP[event.agent_type] ?? { label: event.agent_type, color: '#888', icon: '?' }}
        <div class="activity-item" class:is-progress={event.is_progress}>
          <span class="activity-time">{formatRelativeTime(event.published_at)}</span>
          <span class="activity-dot" style:background={agent.color}></span>
          <span class="activity-icon">{agent.icon}</span>
          <span class="activity-text">
            <strong style="color: {agent.color}">{agent.label}</strong>
            {#if event.is_progress}
              <span class="activity-progress">{event.title}</span>
            {:else}
              published: {event.title}
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </section>

  <!-- STANDALONE POSTS -->
  {#if data.standalonePosts.length > 0}
    <section class="feed standalone">
      <h2 class="section-title">Earlier Discoveries</h2>
      {#each data.standalonePosts as post}
        <AgentPost post={{
          id: post.id, agentType: post.agent_type, title: post.title,
          summary: post.summary ?? '', content: post.content,
          publishedAt: post.published_at, metadata: post.metadata ?? {}
        }} />
      {/each}
    </section>
  {/if}
</div>

<style>
  .hero { text-align: center; padding: 48px 0 32px; }
  h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.2; margin-bottom: 16px; }
  .accent { color: var(--color-accent); }
  .hero-sub { color: var(--color-text-muted); font-size: 1.1rem; max-width: 640px; margin: 0 auto 32px; }
  .stats { display: flex; gap: 48px; justify-content: center; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-accent); font-family: var(--font-mono); }
  .stat-label { font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  /* Live Status Bar */
  .live-status {
    background: var(--color-bg-card);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius);
    padding: 16px 20px;
    margin-bottom: 32px;
  }

  .live-status.idle {
    border-color: var(--color-border);
  }

  .live-status-inner {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .live-pulse {
    width: 10px; height: 10px;
    background: var(--color-accent);
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .idle-dot {
    width: 10px; height: 10px;
    background: var(--color-text-muted);
    border-radius: 50%;
    opacity: 0.5;
    flex-shrink: 0;
  }

  .live-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.1em;
    flex-shrink: 0;
  }

  .idle .live-label { color: var(--color-text-muted); }

  .live-icon { font-size: 1.1rem; }

  .live-text { font-size: 0.9rem; }
  .live-sample { color: var(--color-text-muted); font-family: var(--font-mono); font-size: 0.8rem; }

  .live-detail {
    margin-top: 8px;
    padding-left: 42px;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.4); }
    50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(0, 212, 170, 0); }
  }

  /* Feed */
  .feed { margin-top: 16px; }
  .standalone { margin-top: 40px; }
  .feed-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border);
  }
  .section-title { font-size: 1.25rem; margin: 0 0 24px; }
  .feed-header .section-title { margin: 0; }

  /* Pipeline Card */
  .pipeline-card {
    display: block; background: var(--color-bg-card); border: 1px solid var(--color-border);
    border-radius: var(--radius); padding: 24px; margin-bottom: 16px;
    text-decoration: none; color: var(--color-text); transition: border-color 0.2s, transform 0.1s;
  }
  .pipeline-card:hover { border-color: var(--color-accent); transform: translateY(-1px); text-decoration: none; }
  .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .cancer-type { font-size: 1.15rem; font-weight: 700; }
  .status-pill {
    font-size: 0.7rem; font-family: var(--font-mono); padding: 3px 10px;
    border-radius: 9999px; font-weight: 600; display: flex; align-items: center; gap: 5px;
  }
  .status-running { background: var(--color-accent-dim); color: var(--color-accent); }
  .status-completed { background: var(--color-accent-dim); color: var(--color-accent); }
  .dot { width: 6px; height: 6px; background: var(--color-accent); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
  .sample-id { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 16px; }

  /* Progress dots */
  .progress-steps { display: flex; align-items: center; margin-bottom: 16px; }
  .progress-dot {
    width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-family: var(--font-mono); color: var(--color-text-muted); flex-shrink: 0;
  }
  .progress-dot.done { border-color: var(--dot-color); background: color-mix(in srgb, var(--dot-color) 20%, transparent); color: var(--dot-color); }
  .progress-dot.current { border-color: var(--dot-color); border-style: dashed; color: var(--dot-color); }
  .dot-check { font-size: 0.7rem; }
  .dot-spinner { width: 10px; height: 10px; border: 2px solid transparent; border-top-color: var(--dot-color); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dot-num { font-weight: 600; }
  .progress-line { flex: 1; height: 2px; background: var(--color-border); min-width: 12px; }
  .progress-line.done { background: var(--color-accent); }

  .latest-post { font-size: 0.85rem; margin-bottom: 12px; line-height: 1.4; }
  .latest-label { color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; margin-right: 6px; }
  .latest-title { color: var(--color-text); }
  .card-footer { display: flex; justify-content: space-between; align-items: center; }
  .post-count { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-accent); }
  .time { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-muted); }

  /* Activity Log */
  .activity {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid var(--color-border);
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
    font-size: 0.85rem;
  }

  .activity-item.is-progress {
    opacity: 0.6;
  }

  .activity-time {
    flex-shrink: 0;
    width: 60px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
    padding-top: 2px;
    text-align: right;
  }

  .activity-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 5px;
  }

  .activity-icon {
    flex-shrink: 0;
  }

  .activity-text {
    flex: 1;
    line-height: 1.4;
  }

  .activity-progress {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .empty { color: var(--color-text-muted); text-align: center; padding: 48px; }
</style>
