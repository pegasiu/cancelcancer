<script lang="ts">
	import { marked } from 'marked';

	const AGENT_MAP: Record<string, { label: string; color: string }> = {
		mutation_hunter: { label: 'Mutation Hunter', color: '#ff6b6b' },
		neoantigen_scout: { label: 'Neoantigen Scout', color: '#4ecdc4' },
		structure_prophet: { label: 'Structure Prophet', color: '#45b7d1' },
		mrna_architect: { label: 'mRNA Architect', color: '#96f2d7' },
		drug_simulator: { label: 'Drug Simulator', color: '#dda0dd' },
		publisher: { label: 'Publisher', color: '#ffd93d' }
	};

	let { data } = $props();

	let agent = $derived(
		AGENT_MAP[data.post.agent_type] ?? { label: data.post.agent_type, color: '#888' }
	);

	let relativeTime = $derived(formatRelativeTime(data.post.published_at));

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
		if (diffDays < 30) return `${diffDays}d ago`;
		const diffMonths = Math.floor(diffDays / 30);
		if (diffMonths < 12) return `${diffMonths}mo ago`;
		const diffYears = Math.floor(diffMonths / 12);
		return `${diffYears}y ago`;
	}
</script>

<svelte:head>
	<title>{data.post.title} — CancelCancer</title>
	<meta name="description" content={data.post.summary} />
</svelte:head>

<div class="post-page">
	<a href="/" class="back-link">&larr; Back to feed</a>

	<article class="post">
		<header class="post-header">
			<div class="post-meta">
				<span class="agent-badge" style:--agent-color={agent.color}>
					{agent.label}
				</span>
				<time class="time" datetime={data.post.published_at}>{relativeTime}</time>
			</div>
			<h1 class="post-title">{data.post.title}</h1>
			{#if data.post.summary}
				<p class="post-summary">{data.post.summary}</p>
			{/if}
		</header>

		<div class="prose">
			{@html marked(data.post.content)}
		</div>

		{#if data.post.metadata && Object.keys(data.post.metadata).length > 0}
			<section class="metadata-section">
				<h2 class="metadata-heading">Metadata</h2>
				<pre class="metadata-block"><code>{JSON.stringify(data.post.metadata, null, 2)}</code></pre>
			</section>
		{/if}
	</article>
</div>

<style>
	.post-page {
		max-width: 780px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-block;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		text-decoration: none;
		margin-bottom: 24px;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--color-accent);
	}

	.post {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 32px;
	}

	.post-header {
		margin-bottom: 32px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--color-border);
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.agent-badge {
		display: inline-block;
		background: color-mix(in srgb, var(--agent-color) 15%, transparent);
		color: var(--agent-color);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 9999px;
		letter-spacing: 0.02em;
	}

	.time {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-family: var(--font-mono);
	}

	.post-title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-text);
		line-height: 1.3;
		margin: 0 0 12px;
	}

	.post-summary {
		color: var(--color-text-muted);
		font-size: 1rem;
		line-height: 1.6;
		margin: 0;
	}

	/* Prose typography for rendered markdown content */
	.prose {
		color: var(--color-text);
		font-size: 0.95rem;
		line-height: 1.75;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.prose :global(h1) {
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--color-text);
		margin: 2rem 0 1rem;
		line-height: 1.3;
	}

	.prose :global(h2) {
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 1.75rem 0 0.75rem;
		line-height: 1.3;
	}

	.prose :global(h3) {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 1.5rem 0 0.5rem;
		line-height: 1.4;
	}

	.prose :global(h4),
	.prose :global(h5),
	.prose :global(h6) {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 1.25rem 0 0.5rem;
	}

	.prose :global(p) {
		margin: 0 0 1rem;
	}

	.prose :global(strong) {
		font-weight: 700;
		color: var(--color-text);
	}

	.prose :global(em) {
		font-style: italic;
	}

	.prose :global(a) {
		color: var(--color-accent);
		text-decoration: underline;
	}

	.prose :global(a:hover) {
		opacity: 0.8;
	}

	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1rem;
		padding-left: 1.5rem;
	}

	.prose :global(li) {
		margin-bottom: 0.35rem;
	}

	.prose :global(li::marker) {
		color: var(--color-text-muted);
	}

	.prose :global(blockquote) {
		border-left: 3px solid var(--color-accent);
		margin: 1rem 0;
		padding: 0.5rem 1rem;
		color: var(--color-text-muted);
		background: var(--color-bg-elevated);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.prose :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: var(--color-bg-elevated);
		padding: 0.15em 0.4em;
		border-radius: var(--radius-sm);
		color: var(--color-accent);
	}

	.prose :global(pre) {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 16px;
		margin: 1rem 0;
		overflow-x: auto;
		white-space: pre;
	}

	.prose :global(pre code) {
		background: none;
		padding: 0;
		border-radius: 0;
		color: var(--color-text);
		font-size: 0.85rem;
		line-height: 1.6;
	}

	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		font-size: 0.9rem;
	}

	.prose :global(th) {
		background: var(--color-bg-elevated);
		font-weight: 600;
		text-align: left;
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}

	.prose :global(td) {
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}

	.prose :global(tr:nth-child(even)) {
		background: color-mix(in srgb, var(--color-bg-elevated) 50%, transparent);
	}

	.prose :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 2rem 0;
	}

	.prose :global(img) {
		max-width: 100%;
		border-radius: var(--radius);
	}

	/* Metadata section */
	.metadata-section {
		margin-top: 32px;
		padding-top: 24px;
		border-top: 1px solid var(--color-border);
	}

	.metadata-heading {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 12px;
	}

	.metadata-block {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 16px;
		margin: 0;
		overflow-x: auto;
		white-space: pre;
	}

	.metadata-block code {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	@media (max-width: 640px) {
		.post {
			padding: 20px;
		}

		.post-title {
			font-size: 1.35rem;
		}
	}
</style>
