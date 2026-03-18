import { Worker } from "bullmq";
import { createDb, jobs } from "@cancelcancer/db";
import { eq } from "drizzle-orm";
import { handleVariantCalling } from "../agents/mutation-hunter";
import { handleNeoantigenPrediction } from "../agents/neoantigen-scout";
import { handleStructurePrediction } from "../agents/structure-prophet";
import { handleMrnaDesign } from "../agents/mrna-architect";
import { handleMolecularDocking } from "../agents/drug-simulator";
import { handlePublishPost } from "../agents/publisher";

export function redisConnection() {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  };
}

const JOB_HANDLERS: Record<string, (data: any) => Promise<Record<string, unknown>>> = {
  variant_calling: handleVariantCalling,
  neoantigen_prediction: handleNeoantigenPrediction,
  structure_prediction: handleStructurePrediction,
  mrna_design: handleMrnaDesign,
  molecular_docking: handleMolecularDocking,
  publish_post: handlePublishPost,
};

export function initWorkers() {
  const db = createDb(process.env.DATABASE_URL!);

  const worker = new Worker(
    "jobs",
    async (bullJob) => {
      const { jobId, ...input } = bullJob.data;
      const handler = JOB_HANDLERS[bullJob.name];

      if (!handler) throw new Error(`Unknown job type: ${bullJob.name}`);

      // Mark as running
      await db
        .update(jobs)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(jobs.id, jobId));

      try {
        const output = await handler(input);

        // Mark as completed
        await db
          .update(jobs)
          .set({
            status: "completed",
            output,
            progress: 100,
            completedAt: new Date(),
          })
          .where(eq(jobs.id, jobId));

        return output;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await db
          .update(jobs)
          .set({ status: "failed", error: errorMsg, completedAt: new Date() })
          .where(eq(jobs.id, jobId));
        throw error;
      }
    },
    {
      connection: redisConnection(),
      concurrency: 3,
    }
  );

  worker.on("ready", () => console.log("🔬 Job worker ready"));
  worker.on("failed", (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message));
  worker.on("completed", (job) => console.log(`✅ Job ${job.id} completed`));

  return worker;
}
