import { dayDiff, normalizeHotelInfo, toIsoDate, z } from '@tidaq/core';
import { postHotelInfoTasks, taskGet, tasksReady, type FetchFn } from './dataforseo';
import type { Env } from './env';
import { taskOutcome } from './ingest';
import type { CollectorStore, QuoteOffer, QuoteResult } from './store';

/**
 * Exact final prices for Price Drops (C-148). Xotelo finds drops but shows base rates without
 * taxes and fees; Google Hotels via DataForSEO, asked from Germany, returns what each site really
 * charges (docs/research/exact-prices.md). Every live drop's exact trip is quoted when it appears
 * and again every `maxAgeMinutes`; the radar shows only drops with a fresh quote.
 */
export const QUOTES = {
  /** A drop's quote is renewed after this long. */
  maxAgeMinutes: 240,
  /** Tasks posted per run (one POST). */
  postLimit: 25,
  /** Answers fetched per run (one request each). */
  fetchLimit: 8,
  /** Paid tasks a day at most (hard rule 4), unless DROP_QUOTE_DAILY_CAP says otherwise. */
  defaultDailyCap: 600,
  /** Spend a month at most in USD, unless DROP_QUOTE_MONTHLY_USD says otherwise. */
  defaultMonthlyUsd: 15,
  /** USD per Hotel Info task, standard queue. */
  costPerTaskUsd: 0.0008,
  /** A posted task not listed as ready after this long is fetched directly. */
  fetchDirectlyAfterMinutes: 10,
} as const;

export interface QuoteRunSummary {
  posted: number;
  done: number;
  failed: number;
  /** Not posted because the daily cap or the monthly budget is used up. */
  budgetLimited: boolean;
  /** Subrequests this run used, so the night grid can take the rest. */
  requests: number;
  errors: string[];
}

const limitsSchema = z.object({
  DROP_QUOTE_DAILY_CAP: z.coerce.number().int().min(0).max(5000).default(QUOTES.defaultDailyCap),
  DROP_QUOTE_MONTHLY_USD: z.coerce.number().min(0).max(500).default(QUOTES.defaultMonthlyUsd),
});

/** How many tasks the budget guard allows now (hard rule 4). Pure. */
export function quoteAllowance(
  usage: { postedToday: number; spentMonthUsd: number },
  limits: { dailyCap: number; monthlyUsd: number },
): number {
  const byDay = limits.dailyCap - usage.postedToday;
  const byMonth = Math.floor(
    (limits.monthlyUsd - usage.spentMonthUsd + 1e-9) / QUOTES.costPerTaskUsd,
  );
  return Math.max(0, Math.min(byDay, byMonth));
}

/** One quote's offers for our table: the eligible, known sites, cheapest first. Pure. */
export function quoteOffers(
  result: Parameters<typeof normalizeHotelInfo>[0],
  nights: number,
  aliases: ReadonlyMap<string, string>,
): QuoteOffer[] {
  return normalizeHotelInfo(result, nights, aliases)
    .offers.filter((o) => o.eligible && o.providerSlug)
    .map((o) => ({
      slug: o.providerSlug as string,
      name: o.sourceName,
      nightly_cents: o.nightlyCents,
      total_cents: o.totalCents,
      url: o.url,
      official: o.isOfficial,
    }))
    .sort((a, b) => a.total_cents - b.total_cents);
}

/**
 * One quote step inside the collect run: collect answers that are ready, then post new tasks for
 * drops that need a quote, inside the budget guard. Without work it costs two queries.
 */
export async function runDropQuotes(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<QuoteRunSummary> {
  const { store, env, now } = opts;
  const summary: QuoteRunSummary = {
    posted: 0,
    done: 0,
    failed: 0,
    budgetLimited: false,
    requests: 0,
    errors: [],
  };
  const creds = { login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD };
  const today = toIsoDate(now.getTime());

  // 1. Answers.
  const pending = await store.dropQuotePending(QUOTES.fetchLimit);
  summary.requests++;
  if (pending.length > 0) {
    let ready = new Set<string>();
    try {
      ready = await tasksReady(creds, opts.fetchFn);
    } catch (err) {
      summary.errors.push(`tasks_ready: ${String(err)}`);
    }
    summary.requests++;
    const directAfter = now.getTime() - QUOTES.fetchDirectlyAfterMinutes * 60_000;
    const due = pending.filter((p) => ready.has(p.taskId) || Date.parse(p.postedAt) < directAfter);
    if (due.length > 0) {
      const aliases = await store.providerAliases();
      summary.requests++;
      const results: QuoteResult[] = [];
      for (const p of due) {
        summary.requests++;
        try {
          const outcome = taskOutcome(await taskGet(p.taskId, creds, opts.fetchFn));
          if (outcome.kind === 'pending') continue;
          const offers =
            outcome.kind === 'done'
              ? quoteOffers(outcome.result, dayDiff(p.night, p.checkOut), aliases)
              : [];
          const ok = offers.length > 0;
          results.push({
            hotelId: p.hotelId,
            night: p.night,
            checkOut: p.checkOut,
            status: ok ? 'done' : 'failed',
            quotedAt: new Date().toISOString(),
            offers: ok ? offers : null,
          });
          if (ok) summary.done++;
          else summary.failed++;
        } catch (err) {
          summary.errors.push(`task ${p.taskId}: ${String(err)}`);
        }
      }
      if (results.length > 0) {
        await store.recordQuoteResults(results);
        summary.requests++;
      }
    }
  }

  // 2. New tasks, inside the budget guard (hard rule 4).
  const limits = limitsSchema.parse(env);
  const usage = await store.dropQuoteUsage(today);
  summary.requests++;
  const allowed = Math.min(
    QUOTES.postLimit,
    quoteAllowance(usage, {
      dailyCap: limits.DROP_QUOTE_DAILY_CAP,
      monthlyUsd: limits.DROP_QUOTE_MONTHLY_USD,
    }),
  );
  if (allowed === 0) {
    summary.budgetLimited = true;
    return summary;
  }
  const jobs = await store.dropQuoteJobs(today, QUOTES.maxAgeMinutes, allowed);
  summary.requests++;
  if (jobs.length === 0) return summary;
  const posted = await postHotelInfoTasks(
    jobs.map((j, i) => ({
      hotelIdentifier: j.hotelIdentifier,
      checkIn: j.night,
      checkOut: j.checkOut,
      adults: 2,
      stayId: i,
    })),
    creds,
    opts.fetchFn,
  );
  summary.requests++;
  summary.errors.push(...posted.errors.map((e) => `post: ${e.message}`));
  const postedAt = new Date().toISOString();
  const rows = posted.posted.flatMap((t) => {
    const job = jobs[t.stayId];
    return job
      ? [
          {
            taskId: t.id,
            hotelId: job.hotelId,
            night: job.night,
            checkOut: job.checkOut,
            postedAt,
            costUsd: t.costUsd,
          },
        ]
      : [];
  });
  if (rows.length > 0) {
    await store.recordQuotePosts(rows);
    // The quote rows and the budget log.
    summary.requests += 2;
  }
  summary.posted = rows.length;
  return summary;
}
