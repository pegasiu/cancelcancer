export interface Env {
  CRON_TARGET_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCron(env));
  },

  async fetch(request: Request, env: Env) {
    if (request.method === "POST") {
      const result = await runCron(env);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("CancelCancer Cron Worker. POST to trigger manually.", { status: 200 });
  },
};

async function runCron(env: Env): Promise<unknown> {
  const url = `${env.CRON_TARGET_URL}/api/cron`;
  console.log(`[cron] Calling ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  console.log(`[cron] Result:`, JSON.stringify(data));
  return data;
}
