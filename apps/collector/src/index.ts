import { safeEqual, runToken } from './auth';
import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import { runPosting } from './morning';
import type { CollectorStore } from './store';
import { supabaseStore } from './supabaseStore';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/** Cron schedule (wrangler.jsonc): 05:00 morning run, 17:00 evening run (off until EVENING_RUN). */
export const CRON_MORNING = '0 5 * * *';
export const CRON_EVENING = '0 17 * * *';

/** Seams for tests: the real worker uses Supabase and global fetch. */
export interface Deps {
  store?: CollectorStore;
  fetchFn?: FetchFn;
  now?: () => Date;
}

function storeFor(env: Env, deps: Deps): CollectorStore {
  if (deps.store) return deps.store;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return supabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

const log = (msg: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ msg, ...data }));

export function createWorker(deps: Deps = {}) {
  const now = deps.now ?? (() => new Date());
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const { pathname } = new URL(request.url);

      if (pathname === '/health') return json({ ok: true });

      if (pathname === '/postback') {
        // Results are collected by polling (D-39); postback stays unused.
        return json({ ok: false, error: 'not_implemented' }, 501);
      }

      if (pathname === '/run') {
        if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
        const secret = env.SUPABASE_SERVICE_ROLE_KEY;
        const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
        if (!secret || !given || !safeEqual(given, await runToken(secret))) {
          return json({ ok: false, error: 'unauthorized' }, 401);
        }
        try {
          const summary = await runPosting({
            store: storeFor(env, deps),
            env,
            now: now(),
            kind: 'manual',
            fetchFn: deps.fetchFn,
          });
          log('manual run done', { ...summary });
          return json({ ok: true, summary });
        } catch (err) {
          log('manual run failed', { error: String(err) });
          return json({ ok: false, error: 'run_failed', message: String(err) }, 500);
        }
      }

      return json({ ok: false, error: 'not_found' }, 404);
    },

    async scheduled(controller: ScheduledController, env: Env): Promise<void> {
      const evening = controller.cron === CRON_EVENING;
      if (evening && env.EVENING_RUN !== 'true') {
        log('evening run disabled', { cron: controller.cron });
        return;
      }
      if (controller.cron !== CRON_MORNING && !evening) {
        // Collect runs (05:30, 06:30) arrive with C-013b.
        log('no handler for cron', { cron: controller.cron });
        return;
      }
      const summary = await runPosting({
        store: storeFor(env, deps),
        env,
        now: now(),
        kind: evening ? 'evening' : 'morning',
        fetchFn: deps.fetchFn,
      });
      log('posting run done', { ...summary });
    },
  } satisfies ExportedHandler<Env>;
}

export default createWorker();
