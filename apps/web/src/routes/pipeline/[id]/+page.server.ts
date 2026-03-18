import { neon } from "@neondatabase/serverless";
import { DATABASE_URL } from "$env/static/private";
import { error } from "@sveltejs/kit";

export async function load({ params }) {
  const sql = neon(DATABASE_URL);

  const [pipeline] = await sql`
    SELECT id, sample_id, cancer_type, source, status, current_step, results, total_cost_usd, created_at, completed_at
    FROM pipeline_runs
    WHERE id = ${params.id}
  `;

  if (!pipeline) error(404, "Pipeline not found");

  const posts = await sql`
    SELECT id, agent_type, title, summary, content, published_at, metadata
    FROM agent_posts
    WHERE pipeline_run_id = ${params.id}
    ORDER BY published_at ASC
  `;

  return { pipeline, posts };
}
