import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jobsRouter } from "./api/jobs";
import { pipelinesRouter } from "./api/pipelines";
import { postsRouter } from "./api/posts";
import { initWorkers } from "./workers";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "https://cancelcancer.com",
      "http://localhost:5173", // SvelteKit dev
    ],
  })
);

// Health check
app.get("/", (c) => c.json({ service: "cancelcancer-orchestrator", status: "ok" }));

// API routes
app.route("/api/jobs", jobsRouter);
app.route("/api/pipelines", pipelinesRouter);
app.route("/api/posts", postsRouter);

// Initialize BullMQ workers
initWorkers();

const port = parseInt(process.env.PORT || "3001");
console.log(`🧬 CancelCancer Orchestrator running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
