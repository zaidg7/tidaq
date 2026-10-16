import {
  DFS_NO_RESULTS,
  DFS_OK,
  dfsLocationCode,
  matchHotelSearch,
  metersBetween,
  toIsoDate,
} from '@tidaq/core';
import {
  postHotelSearchTasks,
  searchTaskGet,
  searchTasksReady,
  type DfsCredentials,
  type FetchFn,
} from './dataforseo';
import type { CollectorStore, LookupResult } from './store';

/**
 * Google ids on demand (C-153). A Price Drop gets an exact quote only for a hotel with a Google
 * Hotels id (C-148); hotels added later have none. When such a hotel has a live drop, the collector
 * searches Google Hotels for it in its own country (one paid task) and stores the result that is
 * clearly the same hotel (name and ≤ 1.5 km, `matchHotelSearch`). A miss is not paid for again for
 * 14 days (SQL `dfs_lookup_jobs`).
 */
export const LOOKUPS = {
  /** Lookups posted per run at most; quotes get the rest of the allowance. */
  postLimit: 5,
  /** Answers fetched per run. */
  fetchLimit: 5,
  /** A posted lookup not listed as ready after this long is fetched directly. */
  fetchDirectlyAfterMinutes: 10,
  /** The search's stay: a month ahead, one night (any dates work; prices are not used). */
  daysAhead: 30,
} as const;

export interface LookupRunSummary {
  posted: number;
  found: number;
  notFound: number;
  failed: number;
  requests: number;
  errors: string[];
}

const addDays = (day: string, n: number) =>
  toIsoDate(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000);

/**
 * Collects answers, then posts up to `allowed` new lookups (the caller's budget guard decides
 * `allowed`, hard rule 4). Without work it costs one query, or two when `allowed` > 0.
 */
export async function runDfsLookups(opts: {
  store: CollectorStore;
  creds: DfsCredentials;
  now: Date;
  allowed: number;
  fetchFn?: FetchFn;
}): Promise<LookupRunSummary> {
  const { store, creds, now } = opts;
  const s: LookupRunSummary = {
    posted: 0,
    found: 0,
    notFound: 0,
    failed: 0,
    requests: 0,
    errors: [],
  };

  // 1. Answers.
  const pending = await store.dfsLookupPending(LOOKUPS.fetchLimit);
  s.requests++;
  if (pending.length > 0) {
    let ready = new Set<string>();
    try {
      ready = await searchTasksReady(creds, opts.fetchFn);
    } catch (err) {
      s.errors.push(`lookup tasks_ready: ${String(err)}`);
    }
    s.requests++;
    const directAfter = now.getTime() - LOOKUPS.fetchDirectlyAfterMinutes * 60_000;
    const results: LookupResult[] = [];
    for (const p of pending) {
      if (!ready.has(p.taskId) && Date.parse(p.postedAt) >= directAfter) continue;
      s.requests++;
      try {
        const task = (await searchTaskGet(p.taskId, creds, opts.fetchFn)).tasks[0];
        if (!task || task.status_code === 40601 || task.status_code === 40602) continue;
        const items = task.status_code === DFS_OK ? (task.result?.[0]?.items ?? []) : [];
        const candidates = items.map((i) => ({
          id: i.hotel_identifier,
          title: i.title,
          lat: i.location?.latitude ?? null,
          lng: i.location?.longitude ?? null,
        }));
        const match = matchHotelSearch(p, candidates);
        // "No results" is an answer (retried after 14 days); other errors after a day (SQL).
        const answered = task.status_code === DFS_OK || task.status_code === DFS_NO_RESULTS;
        const status = match ? 'found' : answered ? 'not_found' : 'failed';
        results.push({
          hotelId: p.hotelId,
          status,
          identifier: match?.id ?? null,
          finishedAt: new Date().toISOString(),
          candidates: candidates.slice(0, 3).map((c) => ({
            title: c.title,
            id: c.id,
            meters:
              c.lat === null || c.lng === null
                ? null
                : Math.round(metersBetween(p.lat, p.lng, c.lat, c.lng)),
          })),
        });
        if (status === 'found') s.found++;
        else if (status === 'not_found') s.notFound++;
        else s.failed++;
      } catch (err) {
        s.errors.push(`lookup ${p.taskId}: ${String(err)}`);
      }
    }
    if (results.length > 0) {
      await store.recordLookupResults(results);
      s.requests += results.length + results.filter((r) => r.status === 'found').length;
    }
  }

  // 2. New lookups, inside the caller's allowance.
  const allowed = Math.min(LOOKUPS.postLimit, opts.allowed);
  if (allowed <= 0) return s;
  const today = toIsoDate(now.getTime());
  const jobs = await store.dfsLookupJobs(today, allowed);
  s.requests++;
  const checkIn = addDays(today, LOOKUPS.daysAhead);
  const checkOut = addDays(checkIn, 1);
  const tasks = jobs.flatMap((j) => {
    const locationCode = dfsLocationCode(j.countryCode);
    return locationCode === null
      ? []
      : [{ hotelId: j.hotelId, keyword: `${j.name} ${j.cityEn}`, locationCode, checkIn, checkOut }];
  });
  if (tasks.length === 0) return s;
  const posted = await postHotelSearchTasks(tasks, creds, opts.fetchFn);
  s.requests++;
  s.errors.push(...posted.errors.map((e) => `lookup post ${e.hotelId}: ${e.message}`));
  if (posted.posted.length > 0) {
    const postedAt = new Date().toISOString();
    await store.recordLookupPosts(
      posted.posted.map((t) => ({
        taskId: t.id,
        hotelId: t.hotelId,
        postedAt,
        costUsd: t.costUsd,
        checkIn,
        checkOut,
      })),
    );
    s.requests += 2;
  }
  s.posted = posted.posted.length;
  return s;
}
