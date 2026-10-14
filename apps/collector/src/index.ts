import { runToken, safeEqual } from '@tidaq/core';
import { runCollect } from './collect';
import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import { runPosting, runRequests, type PostRunSummary } from './morning';
import { crashEmail, postingEmail, sendAdminEmail } from './notify';
import { runDailyCheck } from './report';
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
/**
 * Collect runs every 10 minutes, all day (D-39, C-013b, C-022c1). Each first queues stays a visitor
 * just requested, then fetches at most COLLECT_BATCH results, so ~400 morning tasks need ~13 runs
 * and a requested stay has prices within minutes. Idle, a run costs two queries.
 */
export const CRON_COLLECT = '*/10 * * * *';
/** Daily check after the morning collect window: prune raw JSON, email problems (C-013c). */
export const CRON_DAILY = '55 7 * * *';

/** Seams for tests: the real worker uses Supabase and global fetch. */
export interface Deps {
  store?: CollectorStore;
  fetchFn?: FetchFn;
  /** Used for admin emails (Resend). */
  mailFetchFn?: FetchFn;
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
  const mail = (env: Env, email: Parameters<typeof sendAdminEmail>[1]) =>
    sendAdminEmail(env, email, deps.mailFetchFn);

  /** Posting run plus admin email on errors, a crash or the 80 % budget crossing. */
  const posting = async (
    env: Env,
    kind: 'morning' | 'evening' | 'manual',
  ): Promise<PostRunSummary> => {
    try {
      const summary = await runPosting({
        store: storeFor(env, deps),
        env,
        now: now(),
        kind,
        fetchFn: deps.fetchFn,
      });
      const email = postingEmail(summary);
      if (email) await mail(env, email);
      return summary;
    } catch (err) {
      await mail(env, crashEmail(`${kind} run`, err));
      throw err;
    }
  };

  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const { pathname } = new URL(request.url);

      if (pathname === '/health') return json({ ok: true });

      if (pathname === '/postback') {
        // Results are collected by polling (D-39); postback stays unused.
        return json({ ok: false, error: 'not_implemented' }, 501);
      }

      if (pathname === '/run' || pathname === '/collect') {
        if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
        const secret = env.SUPABASE_SERVICE_ROLE_KEY;
        const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
        if (!secret || !given || !safeEqual(given, await runToken(secret))) {
          return json({ ok: false, error: 'unauthorized' }, 401);
        }
        const kind = pathname === '/run' ? 'manual run' : 'manual collect';
        try {
          const store = storeFor(env, deps);
          // `/collect` does what the collect cron does: queue requested stays, then collect.
          const summary =
            pathname === '/run'
              ? await posting(env, 'manual')
              : {
                  requests: await runRequests({ store, env, now: now(), fetchFn: deps.fetchFn }),
                  ...(await runCollect({ store, env, now: now(), fetchFn: deps.fetchFn })),
                };
          log(`${kind} done`, { ...summary });
          return json({ ok: true, summary });
        } catch (err) {
          log(`${kind} failed`, { error: String(err) });
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
      if (controller.cron === CRON_DAILY) {
        try {
          const summary = await runDailyCheck({
            store: storeFor(env, deps),
            env,
            now: now(),
            fetchFn: deps.mailFetchFn,
          });
          log('daily check done', { ...summary });
        } catch (err) {
          await mail(env, crashEmail('daily check', err));
          throw err;
        }
        return;
      }
      if (controller.cron === CRON_COLLECT) {
        const store = storeFor(env, deps);
        // A failed request run must not stop the collect run; its errors are on its run row.
        try {
          const requests = await runRequests({ store, env, now: now(), fetchFn: deps.fetchFn });
          if (requests.runId !== null) log('request run done', { ...requests });
        } catch (err) {
          log('request run failed', { error: String(err) });
        }
        const summary = await runCollect({
          store,
          env,
          now: now(),
          fetchFn: deps.fetchFn,
        });
        if (summary.runId !== null) log('collect run done', { ...summary });
        return;
      }
      if (controller.cron !== CRON_MORNING && !evening) {
        log('no handler for cron', { cron: controller.cron });
        return;
      }
      const summary = await posting(env, evening ? 'evening' : 'morning');
      log('posting run done', { ...summary });
    },
  } satisfies ExportedHandler<Env>;
}

export default createWorker();
