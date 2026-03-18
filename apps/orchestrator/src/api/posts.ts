import { Hono } from "hono";
import { createDb, agentPosts } from "@cancelcancer/db";
import { eq, desc } from "drizzle-orm";

const db = createDb(process.env.DATABASE_URL!);

export const postsRouter = new Hono();

// List published posts (public feed)
postsRouter.get("/", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const posts = await db
    .select()
    .from(agentPosts)
    .where(eq(agentPosts.isPublished, true))
    .orderBy(desc(agentPosts.publishedAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({ success: true, data: posts, page, pageSize });
});

// Get single post
postsRouter.get("/:id", async (c) => {
  const [post] = await db
    .select()
    .from(agentPosts)
    .where(eq(agentPosts.id, c.req.param("id")));
  if (!post) return c.json({ success: false, error: "Post not found" }, 404);
  return c.json({ success: true, data: post });
});
