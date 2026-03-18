import { Hono } from "hono";
import { Queue } from "bullmq";
import { createDb, jobs } from "@cancelcancer/db";
import { eq } from "drizzle-orm";
import { redisConnection } from "../workers";

const db = createDb(process.env.DATABASE_URL!);

export const jobQueue = new Queue("jobs", { connection: redisConnection() });

export const jobsRouter = new Hono();

// Submit a new job
jobsRouter.post("/", async (c) => {
  const body = await c.req.json<{
    type: string;
    computeTarget: string;
    input: Record<string, unknown>;
    pipelineRunId?: string;
  }>();

  const [job] = await db
    .insert(jobs)
    .values({
      type: body.type as any,
      computeTarget: body.computeTarget as any,
      input: body.input,
      pipelineRunId: body.pipelineRunId,
    })
    .returning();

  await jobQueue.add(body.type, { jobId: job.id, ...body.input }, { jobId: job.id });

  return c.json({ success: true, data: { jobId: job.id, status: "queued" } }, 201);
});

// Get job status
jobsRouter.get("/:id", async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ success: false, error: "Job not found" }, 404);
  return c.json({ success: true, data: job });
});

// Stream job progress via SSE
jobsRouter.get("/:id/stream", async (c) => {
  const jobId = c.req.param("id");

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Poll job status every 2s
        const interval = setInterval(async () => {
          const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
          if (!job) {
            send({ type: "error", message: "Job not found" });
            clearInterval(interval);
            controller.close();
            return;
          }

          send({ type: "progress", jobId, progress: job.progress, status: job.status });

          if (job.status === "completed" || job.status === "failed") {
            send({
              type: job.status,
              jobId,
              ...(job.status === "completed" ? { output: job.output } : { error: job.error }),
            });
            clearInterval(interval);
            controller.close();
          }
        }, 2000);
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
});
