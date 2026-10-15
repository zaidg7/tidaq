import {
  dayDiff,
  DROP_CHECK,
  judgeDropCheck,
  normalizeHotelInfo,
  toIsoDate,
  type DropCheckOffer,
} from '@tidaq/core';
import type { FetchFn } from './dataforseo';
import { priceSource, type Env } from './env';
import type { CollectorStore, DropCheckRow } from './store';
import { fetchXoteloTask } from './xotelo';

export interface DropCheckSummary {
  /** Drops asked this run. */
  checked: number;
  /** Still offered at about the drop price. */
  live: number;
  /** Gone: the site no longer offers it, or only for more. */
  gone: number;
  /** Busy answers or network errors: asked again next run. */
  retry: number;
  /** Subrequests this run used (Supabase and price calls), so the night grid can take the rest. */
  requests: number;
}

/** Up to 8 calls in flight, like the night grid (C-070a). */
const CONCURRENCY = 8;

/**
 * Live check of Price Drops (C-139): asks the price source again for the drops whose last check
 * is older than DROP_CHECK.staleMinutes (exact hotel, dates, 2 adults) and stores whether the
 * drop's site still offers the trip at about the drop price. The radar hides the gone ones. Runs
 * inside the 2-minute collect run before the night grid (C-142: a cron of its own never fired). Free
 * source only (Xotelo); with DataForSEO it does nothing, the budget guard would not cover it.
 */
export async function runDropChecks(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
  /** Drops this run (default DROP_CHECK.batch). */
  batch?: number;
}): Promise<DropCheckSummary> {
  const { store, env, now } = opts;
  const summary: DropCheckSummary = { checked: 0, live: 0, gone: 0, retry: 0, requests: 0 };
  if (priceSource(env) !== 'xotelo') return summary;
  const today = toIsoDate(now.getTime());
  const jobs = await store.dropCheckJobs(
    today,
    DROP_CHECK.staleMinutes,
    opts.batch ?? DROP_CHECK.batch,
  );
  summary.requests = 1;
  if (jobs.length === 0) return summary;
  const aliases = await store.providerAliases();

  const rows: DropCheckRow[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (!job) break;
      summary.checked++;
      let outcome;
      try {
        outcome = await fetchXoteloTask(
          {
            id: `drop-${job.hotelId}-${job.night}-${job.checkOut}`,
            stayId: 0,
            hotelId: job.hotelId,
            checkIn: job.night,
            checkOut: job.checkOut,
            adults: 2,
            xoteloKey: job.xoteloKey,
            postedAt: now.toISOString(),
          },
          opts.fetchFn,
        );
      } catch {
        summary.retry++;
        continue;
      }
      // A refused answer (odd dates, odd shape) says nothing about the drop: ask again later.
      if (outcome.kind === 'pending' || outcome.kind === 'failed') {
        summary.retry++;
        continue;
      }
      const offers: DropCheckOffer[] =
        outcome.kind === 'done'
          ? normalizeHotelInfo(outcome.result, dayDiff(job.night, job.checkOut), aliases)
              .offers.filter((o) => o.eligible && o.providerSlug)
              .map((o) => ({ slug: o.providerSlug as string, totalCents: o.totalCents }))
          : [];
      const result = judgeDropCheck(
        { providerSlug: job.providerSlug, nowCents: job.nowCents },
        offers,
      );
      if (result.live) summary.live++;
      else summary.gone++;
      rows.push({
        hotelId: job.hotelId,
        night: job.night,
        checkOut: job.checkOut,
        providerSlug: job.providerSlug,
        checkedAt: new Date().toISOString(),
        ...result,
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  if (rows.length > 0) await store.recordDropChecks(rows);
  // Jobs + aliases + one price call per drop + the upsert.
  summary.requests = 2 + summary.checked + (rows.length > 0 ? 1 : 0);
  return summary;
}
