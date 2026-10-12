import type { Env } from './env';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/health') {
      return json({ ok: true });
    }

    if (pathname === '/postback') {
      // DataForSEO postback receiver. Implemented in C-013 once C-010 confirms the mechanism.
      return json({ ok: false, error: 'not_implemented' }, 501);
    }

    return json({ ok: false, error: 'not_found' }, 404);
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const evening = controller.cron === '0 17 * * *';
    if (evening && env.EVENING_RUN !== 'true') {
      console.log(JSON.stringify({ msg: 'evening run disabled', cron: controller.cron }));
      return;
    }
    // The collector pipeline (grid → budget guard → DataForSEO → Supabase) arrives in C-013.
    console.log(
      JSON.stringify({ msg: 'cron fired, collector not implemented yet', cron: controller.cron }),
    );
  },
} satisfies ExportedHandler<Env>;
