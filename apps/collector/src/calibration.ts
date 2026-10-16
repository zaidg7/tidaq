import { calibrationPoints, toIsoDate, z, DFS_OK, type CalibrationItem } from '@tidaq/core';
import { postHotelSearchTasks, searchTaskGet, searchTasksReady, type FetchFn } from './dataforseo';
import { QUOTES, quoteAllowance } from './dropQuotes';
import type { Env } from './env';
import type { CalibrationResult, CollectorStore } from './store';

/**
 * Taxes on our prices (C-157). Once a week per city one Hotel Searches task, asked from Germany
 * like a German visitor (final prices with taxes and fees), gives ~18 hotels with their nightly
 * price. Each of ours among them gives a point: Google's price ÷ our base rate for the same nights
 * (core `calibrationPoints`); pages multiply base rates by the median (SQL `hotel_price_factors`).
 * Paid ($0.0008 a task): behind its own daily cap and the quotes' monthly budget (hard rule 4).
 */
export const CALIBRATIONS = {
  /** Calibration tasks a day at most (48 cities need one a week). */
  dailyCap: 60,
  /** Tasks posted per run. */
  postLimit: 10,
  /** Answers fetched per run. */
  fetchLimit: 5,
  /** A posted task not listed as ready after this long is fetched directly. */
  fetchDirectlyAfterMinutes: 10,
  /**
   * Google as seen from Germany (DataForSEO location code), with the keyword searched as written
   * (`search_this_area: false`): the city's hotels at the prices a German visitor sees.
   */
  locationCode: 2276,
  languageCode: 'de',
  keyword: (cityEn: string) => `luxury hotels ${cityEn}`,
} as const;

export interface CalibrationRunSummary {
  posted: number;
  done: number;
  failed: number;
  points: number;
  budgetLimited: boolean;
  requests: number;
  errors: string[];
}

const monthlySchema = z.object({
  DROP_QUOTE_MONTHLY_USD: z.coerce.number().min(0).max(500).default(QUOTES.defaultMonthlyUsd),
});

/** Collects answers, then posts tasks for cities that are due, inside the budget. */
export async function runCalibrations(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<CalibrationRunSummary> {
  const { store, env, now } = opts;
  const s: CalibrationRunSummary = {
    posted: 0,
    done: 0,
    failed: 0,
    points: 0,
    budgetLimited: false,
    requests: 0,
    errors: [],
  };
  const creds = { login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD };
  const today = toIsoDate(now.getTime());

  // 1. Answers.
  const pending = await store.calibrationPending(CALIBRATIONS.fetchLimit);
  s.requests++;
  if (pending.length > 0) {
    let ready = new Set<string>();
    try {
      ready = await searchTasksReady(creds, opts.fetchFn);
    } catch (err) {
      s.errors.push(`calibration tasks_ready: ${String(err)}`);
    }
    s.requests++;
    const directAfter = now.getTime() - CALIBRATIONS.fetchDirectlyAfterMinutes * 60_000;
    const results: CalibrationResult[] = [];
    for (const p of pending) {
      if (!ready.has(p.taskId) && Date.parse(p.postedAt) >= directAfter) continue;
      s.requests++;
      try {
        const task = (await searchTaskGet(p.taskId, creds, opts.fetchFn)).tasks[0];
        if (!task || task.status_code === 40601 || task.status_code === 40602) continue;
        const items: CalibrationItem[] =
          task.status_code === DFS_OK
            ? (task.result?.[0]?.items ?? []).map((i) => ({
                id: i.hotel_identifier,
                title: i.title,
                lat: i.location?.latitude ?? null,
                lng: i.location?.longitude ?? null,
                price:
                  i.prices?.currency && i.prices.currency !== 'EUR'
                    ? null
                    : (i.prices?.price ?? null),
              }))
            : [];
        const hotels = await store.calibrationHotels(p.cityId, p.checkIn, p.checkOut);
        s.requests++;
        const points = calibrationPoints(hotels, items);
        const ok = task.status_code === DFS_OK;
        results.push({
          id: p.id,
          status: ok ? 'done' : 'failed',
          finishedAt: new Date().toISOString(),
          points,
        });
        if (ok) s.done++;
        else s.failed++;
        s.points += points.length;
      } catch (err) {
        s.errors.push(`calibration ${p.taskId}: ${String(err)}`);
      }
    }
    if (results.length > 0) {
      await store.recordCalibrationResults(results);
      s.requests += results.length * 3;
    }
  }

  // 2. New tasks for due cities: own daily cap, shared monthly budget (asked only when due).
  const due = await store.calibrationDue(today, CALIBRATIONS.postLimit);
  s.requests++;
  if (due.length === 0) return s;
  const [usage, postedToday] = await Promise.all([
    store.dropQuoteUsage(today),
    store.calibrationPostedToday(today),
  ]);
  s.requests += 2;
  const byMonth = quoteAllowance(usage, {
    dailyCap: Number.MAX_SAFE_INTEGER,
    monthlyUsd: monthlySchema.parse(env).DROP_QUOTE_MONTHLY_USD,
  });
  const allowed = Math.min(CALIBRATIONS.dailyCap - postedToday, byMonth);
  if (allowed <= 0) {
    s.budgetLimited = true;
    return s;
  }
  const jobs = due.slice(0, allowed);
  const posted = await postHotelSearchTasks(
    jobs.map((j, i) => ({
      hotelId: i,
      keyword: CALIBRATIONS.keyword(j.cityEn),
      locationCode: CALIBRATIONS.locationCode,
      languageCode: CALIBRATIONS.languageCode,
      searchThisArea: false,
      checkIn: j.checkIn,
      checkOut: j.checkOut,
    })),
    creds,
    opts.fetchFn,
  );
  s.requests++;
  s.errors.push(...posted.errors.map((e) => `calibration post: ${e.message}`));
  const postedAt = new Date().toISOString();
  const rows = posted.posted.flatMap((t) => {
    const j = jobs[t.hotelId];
    return j
      ? [
          {
            taskId: t.id,
            cityId: j.cityId,
            anchorHotelId: j.anchorHotelId,
            checkIn: j.checkIn,
            checkOut: j.checkOut,
            postedAt,
            costUsd: t.costUsd,
          },
        ]
      : [];
  });
  if (rows.length > 0) {
    await store.recordCalibrationPosts(rows);
    s.requests += 2;
  }
  s.posted = rows.length;
  return s;
}
