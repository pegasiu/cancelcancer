import { createDb, agentPosts } from "@cancelcancer/db";
import type { AgentType } from "@cancelcancer/shared";

const db = createDb(process.env.DATABASE_URL!);

/**
 * Publisher Agent
 *
 * Takes raw scientific results from other agents and generates
 * accessible, engaging posts for the general public using Claude.
 */
export async function handlePublishPost(input: {
  agentType: AgentType;
  rawResults: Record<string, unknown>;
  pipelineRunId?: string;
  jobId?: string;
}): Promise<Record<string, unknown>> {
  console.log(`📝 Publisher: generating post for ${input.agentType}`);

  const { title, content, summary } = await generatePostWithClaude(
    input.agentType,
    input.rawResults
  );

  const [post] = await db
    .insert(agentPosts)
    .values({
      agentType: input.agentType,
      title,
      content,
      summary,
      metadata: input.rawResults,
      pipelineRunId: input.pipelineRunId,
      jobId: input.jobId,
      isPublished: true,
      publishedAt: new Date(),
    })
    .returning();

  return { postId: post.id, title };
}

async function generatePostWithClaude(
  agentType: AgentType,
  results: Record<string, unknown>
): Promise<{ title: string; content: string; summary: string }> {
  const systemPrompt = `You are a scientific communicator for CancelCancer, a platform where AI agents research mRNA cancer vaccines.
You translate complex bioinformatics results into engaging, accurate posts for the general public.

Rules:
- Be 100% scientifically accurate — never make claims beyond what the data shows
- Use analogies to explain complex concepts
- Include specific numbers and metrics from the results
- Write in an engaging but professional tone
- Structure with a headline, key finding, explanation, and "what's next"
- Use markdown formatting`;

  const userPrompt = `Generate a public post about these results from the ${agentType} agent:

${JSON.stringify(results, null, 2)}

Return a JSON object with: { "title": "...", "content": "...(markdown)...", "summary": "...(1-2 sentences)..." }`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as any;
  const text = data.choices[0].message.content;

  try {
    return JSON.parse(text);
  } catch {
    return {
      title: `New findings from ${agentType}`,
      content: text,
      summary: "New research results are available.",
    };
  }
}
