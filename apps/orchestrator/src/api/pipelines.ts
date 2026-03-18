import { Hono } from "hono";
import { createDb, pipelineRuns } from "@cancelcancer/db";
import { eq, desc } from "drizzle-orm";
import { jobQueue } from "./jobs";

const db = createDb(process.env.DATABASE_URL!);

export const pipelinesRouter = new Hono();

// Start a full pipeline run for a TCGA sample
pipelinesRouter.post("/", async (c) => {
  const body = await c.req.json<{
    sampleId: string;
    cancerType: string;
  }>();

  const [run] = await db
    .insert(pipelineRuns)
    .values({
      sampleId: body.sampleId,
      cancerType: body.cancerType,
      currentStep: "variant_calling",
    })
    .returning();

  // Kick off the first step — variant calling
  await jobQueue.add(
    "variant_calling",
    { jobId: run.id, sampleId: body.sampleId, pipelineRunId: run.id },
    { jobId: `pipeline-${run.id}-variant_calling` }
  );

  return c.json({ success: true, data: { pipelineRunId: run.id, status: "queued" } }, 201);
});

// Get pipeline status
pipelinesRouter.get("/:id", async (c) => {
  const [run] = await db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.id, c.req.param("id")));
  if (!run) return c.json({ success: false, error: "Pipeline run not found" }, 404);
  return c.json({ success: true, data: run });
});

// List recent pipeline runs
pipelinesRouter.get("/", async (c) => {
  const runs = await db
    .select()
    .from(pipelineRuns)
    .orderBy(desc(pipelineRuns.createdAt))
    .limit(20);
  return c.json({ success: true, data: runs });
});
