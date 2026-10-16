import {
  aliasKey,
  NIGHT_GRID,
  normalizeHotelInfo,
  registrableDomain,
  toIsoDate,
  unknownSources,
  z,
} from '@tidaq/core';
import type { FetchFn } from './dataforseo';
import { priceSource, type Env } from './env';
import type { CollectorStore, NightIngestPayload } from './store';
import { fetchXoteloTask } from './xotelo';

/** Night grid settings (C-070a, D-42, PLAN §7.0). */
export const NIGHTS = {
  /** Nights ahead per hotel. */
  defaultWindow: NIGHT_GRID.windowDays,
  /**
   * Nights per run. Workers Paid (B-023, C-151) allows 10,000 requests per run, so time is the
   * limit, not requests: 40 calls took ~18 s (16 Oct), so 200 fit well inside the 2-minute cron.
   * 270 nights × 400 hotels ≈ 108,000 calls a day ≈ 540 runs ≈ 18 h; nearest nights go first.
   */
  defaultBatch: 200,
  /**
   * No new Xotelo call starts later than this after the collect run began, so a slow Xotelo can't
   * make a run overlap the next one (cron every 2 min) and price the same nights twice. Nights not
   * started stay for the next run.
   */
  runBudgetMs: 90_000,
  /** Xotelo calls in flight at once (spike: 8 in parallel, 0 errors, ~3 s each). */
  concurrency: 8,
} as const;

const settingsSchema = z.object({
  window: z.coerce.number().int().min(0).max(365).default(NIGHTS.defaultWindow),
  batch: z.coerce.number().int().min(1).max(1000).default(NIGHTS.defaultBatch),
});

export interface NightRunSummary {
  /** Null when there was nothing to do (no run row is written then). */
  runId: number | null;
  /** Nights asked this run. */
  fetched: number;
  /** Nights stored with at least one platform. */
  priced: number;
  /** Nights stored without rates (sold out or not listed). */
  empty: number;
  /** Nights left for the next run (busy answers, network errors). */
  retry: number;
  /** Nights Xotelo refused (stored empty); first few in `failures`. */
  failed: number;
  failures: string[];
  rows: number;
  errors: string[];
}

const nothing = (): NightRunSummary => ({
  runId: null,
  fetched: 0,
  priced: 0,
  empty: 0,
  retry: 0,
  failed: 0,
  failures: [],
  rows: 0,
  errors: [],
});

const nextDay = (day: string): string => toIsoDate(Date.parse(`${day}T00:00:00Z`) + 86_400_000);

/**
 * Runs `fn` over `items` with at most `limit` in flight; results keep the input order. Items not
 * started by `deadline` (epoch ms) get `late(item)` instead.
 */
async function pool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  deadline: number,
  late: (item: T) => R,
) {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      const item = items[i] as T;
      out[i] = Date.now() < deadline ? await fn(item) : late(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Nights run (C-070a, D-42): price the next batch of (hotel, night) pairs that have no row for
 * today, one Xotelo call per night, and store every platform's rate for that night plus the
 * cheapest reviewed one. Free source only: with `PRICE_SOURCE=dataforseo` it does nothing, because
 * thousands of paid calls a day would break the budget (hard rule 4). A busy answer (429, 5xx,
 * network) leaves the night for the next run; any other answer is stored, empty if needed, so a
 * night is asked at most once a day.
 */
export async function runNights(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
  /**
   * Requests other work in the same invocation already used (C-142: the drop checks). The batch
   * shrinks by as many (sized for the free plan's 50; harmless on Workers Paid).
   */
  reserve?: number;
  /** Epoch ms after which no new call starts; default `runBudgetMs` from now. */
  deadline?: number;
}): Promise<NightRunSummary> {
  const { store, env, now } = opts;
  if (priceSource(env) !== 'xotelo') return nothing();
  const settings = settingsSchema.parse({
    window: env.NIGHT_WINDOW_DAYS ?? undefined,
    batch: env.NIGHT_BATCH ?? undefined,
  });
  if (settings.window === 0) return nothing();
  const batch = settings.batch - (opts.reserve ?? 0);
  if (batch < 1) return nothing();

  const today = toIsoDate(now.getTime());
  const jobs = await store.nightJobs(today, settings.window, batch);
  if (jobs.length === 0) return nothing();

  const runId = await store.startRun('nights', env.APP_ENV, now.toISOString());
  const errors: string[] = [];
  try {
    const aliases = await store.providerAliases();
    const payload: NightIngestPayload = { providers: [], nights: [] };
    const known = new Set<string>();
    let priced = 0;
    let empty = 0;
    let retry = 0;
    const failures: string[] = [];

    const deadline = opts.deadline ?? Date.now() + NIGHTS.runBudgetMs;
    const outcomes = await pool(
      jobs,
      NIGHTS.concurrency,
      async (job) => {
        try {
          const outcome = await fetchXoteloTask(
            {
              id: `night-${job.hotelId}-${job.night}`,
              stayId: 0,
              hotelId: job.hotelId,
              checkIn: job.night,
              checkOut: nextDay(job.night),
              adults: 2,
              xoteloKey: job.xoteloKey,
              postedAt: now.toISOString(),
            },
            opts.fetchFn,
          );
          return { job, outcome };
        } catch {
          return { job, outcome: null };
        }
      },
      deadline,
      (job) => ({ job, outcome: null }),
    );

    for (const { job, outcome } of outcomes) {
      if (outcome === null || outcome.kind === 'pending') {
        retry++;
        continue;
      }
      const offers: Record<string, number> = {};
      if (outcome.kind === 'done') {
        const eligible = normalizeHotelInfo(outcome.result, 1, aliases).offers.filter(
          (o) => o.eligible,
        );
        for (const o of eligible) {
          const slug = o.providerSlug ?? o.sourceSlug;
          if (!slug) continue;
          offers[slug] = Math.min(offers[slug] ?? Number.POSITIVE_INFINITY, o.totalCents);
        }
        for (const src of unknownSources(eligible)) {
          if (!src.slug || known.has(src.slug)) continue;
          known.add(src.slug);
          payload.providers.push({
            slug: src.slug,
            name: src.name,
            domain: src.domain,
            alias: src.domain ? registrableDomain(src.domain) : aliasKey(src.name),
          });
        }
      } else if (outcome.kind === 'failed') {
        failures.push(`hotel ${job.hotelId} ${job.night}: ${outcome.error}`);
      }
      if (Object.keys(offers).length > 0) priced++;
      else empty++;
      payload.nights.push({ hotel_id: job.hotelId, night: job.night, day: today, offers });
    }

    const rows = payload.nights.length > 0 ? await store.ingestNights(payload) : 0;
    await store.finishRun(runId, {
      finishedAt: new Date().toISOString(),
      tasksDone: rows,
      // Single refused nights are normal (odd dates, odd answers) and only logged: run errors
      // trigger the daily problem email.
      errors,
    });
    return {
      runId,
      fetched: jobs.length,
      priced,
      empty,
      retry,
      failed: failures.length,
      failures: failures.slice(0, 5),
      rows,
      errors,
    };
  } catch (err) {
    errors.push(`run failed: ${err instanceof Error ? err.message : String(err)}`);
    await store.finishRun(runId, { finishedAt: new Date().toISOString(), errors });
    throw err;
  }
}
