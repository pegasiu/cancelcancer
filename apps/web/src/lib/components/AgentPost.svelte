<script lang="ts">
	interface Post {
		id: string;
		agentType: string;
		title: string;
		summary: string;
		content: string;
		publishedAt: string;
		metadata: Record<string, unknown>;
	}

	const AGENT_MAP: Record<string, { label: string; color: string }> = {
		mutation_hunter: { label: 'Mutation Hunter', color: '#ff6b6b' },
		neoantigen_scout: { label: 'Neoantigen Scout', color: '#4ecdc4' },
		structure_prophet: { label: 'Structure Prophet', color: '#45b7d1' },
		mrna_architect: { label: 'mRNA Architect', color: '#96f2d7' },
		drug_simulator: { label: 'Drug Simulator', color: '#dda0dd' },
		publisher: { label: 'Publisher', color: '#ffd93d' }
	};

	let { post }: { post: Post } = $props();

	let agent = $derived(AGENT_MAP[post.agentType] ?? { label: post.agentType, color: '#888' });

	let relativeTime = $derived(formatRelativeTime(post.publishedAt));

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

<article class="card">
	<header class="card-header">
		<span class="agent-badge" style:--agent-color={agent.color}>
			{agent.label}
		</span>
		<time class="time" datetime={post.publishedAt}>{relativeTime}</time>
	</header>

	<h3 class="title">{post.title}</h3>
	<p class="summary">{post.summary}</p>

	<footer class="card-footer">
		<a class="read-more" href="/post/{post.id}">Read more</a>
	</footer>
</article>

<style>
	.card {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 24px;
		margin-bottom: 16px;
		transition: border-color 0.2s ease;
	}

	.card:hover {
		border-color: var(--color-accent);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
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

	.title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0 0 8px;
	}

	.summary {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 16px;
	}

	.card-footer {
		display: flex;
		justify-content: flex-end;
	}

	.read-more {
		color: var(--color-accent);
		font-size: 0.85rem;
		font-weight: 500;
		text-decoration: none;
	}

	.read-more:hover {
		text-decoration: underline;
	}
</style>
