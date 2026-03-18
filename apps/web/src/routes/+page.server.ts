import { neon } from "@neondatabase/serverless";
import { DATABASE_URL } from "$env/static/private";

export async function load() {
  const sql = neon(DATABASE_URL);

  const pipelines = await sql`
    SELECT
      pr.id as pipeline_id,
      pr.sample_id,
      pr.cancer_type,
      pr.status,
      pr.current_step,
      pr.created_at as pipeline_started,
      (SELECT COUNT(*) FROM agent_posts ap WHERE ap.pipeline_run_id = pr.id AND ap.metadata::text NOT LIKE '%progress_update%') as step_count,
      (SELECT COUNT(*) FROM agent_posts ap WHERE ap.pipeline_run_id = pr.id) as total_posts,
      (SELECT ap.title FROM agent_posts ap WHERE ap.pipeline_run_id = pr.id AND ap.metadata::text NOT LIKE '%progress_update%' ORDER BY ap.published_at DESC LIMIT 1) as latest_title,
      (SELECT ap.agent_type FROM agent_posts ap WHERE ap.pipeline_run_id = pr.id AND ap.metadata::text NOT LIKE '%progress_update%' ORDER BY ap.published_at DESC LIMIT 1) as latest_agent,
      (SELECT ap.published_at FROM agent_posts ap WHERE ap.pipeline_run_id = pr.id ORDER BY ap.published_at DESC LIMIT 1) as latest_published
    FROM pipeline_runs pr
    ORDER BY pr.created_at DESC
    LIMIT 10
  `;

  const standalonePosts = await sql`
    SELECT id, agent_type, title, summary, content, published_at, metadata
    FROM agent_posts
    WHERE is_published = true AND pipeline_run_id IS NULL
    ORDER BY published_at DESC
    LIMIT 10
  `;

  // Current activity
  const [activePipeline] = await sql`
    SELECT id, sample_id, cancer_type, current_step
    FROM pipeline_runs WHERE status = 'running'
    ORDER BY created_at DESC LIMIT 1
  `;

  const recentActivity = await sql`
    SELECT agent_type, title, published_at,
           (metadata::text LIKE '%progress_update%') as is_progress
    FROM agent_posts
    ORDER BY published_at DESC
    LIMIT 10
  `;

  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*) FROM pipeline_runs) as total_pipelines,
      (SELECT COUNT(*) FROM pipeline_runs WHERE status = 'completed') as completed_pipelines,
      (SELECT COUNT(*) FROM agent_posts WHERE metadata::text NOT LIKE '%progress_update%') as total_discoveries,
      (SELECT COUNT(DISTINCT sample_id) FROM pipeline_runs) as samples_analyzed
  `;

  return {
    pipelines,
    standalonePosts,
    activePipeline: activePipeline || null,
    recentActivity,
    stats,
  };
}
