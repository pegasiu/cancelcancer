import { json } from "@sveltejs/kit";
import { neon } from "@neondatabase/serverless";
import { DATABASE_URL } from "$env/static/private";

const sql = neon(DATABASE_URL);

/** Lightweight status endpoint for polling — returns current activity */
export async function GET() {
  const [activePipeline] = await sql`
    SELECT id, sample_id, cancer_type, status, current_step, created_at
    FROM pipeline_runs WHERE status = 'running'
    ORDER BY created_at DESC LIMIT 1
  `;

  const recentActivity = await sql`
    SELECT agent_type, title, published_at,
           (metadata::text LIKE '%progress_update%') as is_progress
    FROM agent_posts
    ORDER BY published_at DESC
    LIMIT 15
  `;

  const stats = await sql`
    SELECT
      (SELECT COUNT(*) FROM pipeline_runs) as total_pipelines,
      (SELECT COUNT(*) FROM pipeline_runs WHERE status = 'completed') as completed_pipelines,
      (SELECT COUNT(*) FROM agent_posts WHERE metadata::text NOT LIKE '%progress_update%') as total_discoveries,
      (SELECT COUNT(DISTINCT sample_id) FROM pipeline_runs) as samples_analyzed
  `;

  return json({
    activePipeline: activePipeline || null,
    recentActivity,
    stats: stats[0],
  });
}
