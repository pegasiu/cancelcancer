import { json } from "@sveltejs/kit";
import { neon } from "@neondatabase/serverless";
import { DATABASE_URL, CRON_SECRET } from "$env/static/private";

const sql = neon(DATABASE_URL);

/**
 * Callback endpoint for VAST.ai instances.
 * When a GPU/CPU job finishes, the instance POSTs results here.
 * Protected by CRON_SECRET.
 */
export async function POST({ request }) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { pipelineId, step, results, instanceId } = body;

  if (!pipelineId || !step || !results) {
    return json({ error: "Missing pipelineId, step, or results" }, { status: 400 });
  }

  // Save results to pipeline
  const [pipeline] = await sql`
    SELECT id, results FROM pipeline_runs WHERE id = ${pipelineId}
  `;

  if (!pipeline) {
    return json({ error: "Pipeline not found" }, { status: 404 });
  }

  const currentResults = pipeline.results || {};

  // Store VAST.ai results and mark job as complete
  const updatedResults = {
    ...currentResults,
    [`${step}_vastai_pending`]: null, // Clear pending flag
    [`${step}_vastai_results`]: results,
    [`${step}_vastai_instance`]: instanceId,
  };

  await sql`
    UPDATE pipeline_runs SET results = ${JSON.stringify(updatedResults)}::jsonb
    WHERE id = ${pipelineId}
  `;

  console.log(`[vastai-callback] Received results for ${step} in pipeline ${pipelineId}`);
  return json({ success: true });
}
