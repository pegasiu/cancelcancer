import { neon } from "@neondatabase/serverless";
import { DATABASE_URL } from "$env/static/private";
import { error } from "@sveltejs/kit";

export async function load({ params }) {
  const sql = neon(DATABASE_URL);

  const posts = await sql`
    SELECT id, agent_type, title, summary, content, published_at, metadata
    FROM agent_posts
    WHERE id = ${params.id}
  `;

  if (posts.length === 0) {
    error(404, "Post not found");
  }

  return { post: posts[0] };
}
