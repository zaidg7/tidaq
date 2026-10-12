import { addDays, computeStayStats, STATS, toIsoDate, z } from '@tidaq/core';
import { taskGet, tasksReady, type FetchFn } from './dataforseo';
import type { Env } from './env';
import { buildIngest, taskOutcome, type OpenTask, type TaskOutcome } from './ingest';
import type { CollectorStore, StayStatsRow } from './store';

/** Collect-run settings (C-013b). */
export const COLLECT = {
  /**
   * Results fetched per invocation. The Workers free plan allows 50 external subrequests per
   * invocation; 30 task_gets leave room for retries and ~10 Supabase calls.
   */
  defaultBatch: 30,
  /** Open tasks loaded per run (well above one day's posts). */
  openLimit: 1000,
  /** A task not listed by tasks_ready after this long is fetched directly (lost listing). */
  staleAfterMinutes: 45,
  /** After this long without a result a task is marked failed; the next morning run reposts. */
  expireAfterDays: 3,
} as const;

export interface CollectSummary {
  /** Null when there was nothing to do (no run row is written then). */
  runId: number | null;
  open: number;
  fetched: number;
  done: number;
  noResults: number;
  failed: number;
  stillPending: number;
  expired: number;
  snapshots: number;
  dailyRows: number;
  statsUpdated: number;
  errors: string[];
}

const batchSchema = z.coerce.number().int().min(1).max(500).default(COLLECT.defaultBatch);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Collect run (C-013b): fetch ready results for posted tasks, store eligible offers as
 * snapshots, rebuild `stay_daily` and recompute `stay_stats` for the touched stays.
 * Free calls only (tasks_ready, task_get), so no budget guard is needed here.
 */
export async function runCollect(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<CollectSummary> {
  const { store, env, now } = opts;
  const batch = batchSchema.parse(env.COLLECT_BATCH ?? undefined);
  const creds = { login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD };
  const nowMs = now.getTime();
  const errors: string[] = [];

  const open = await store.openTasks(COLLECT.openLimit);
  const expireBefore = nowMs - COLLECT.expireAfterDays * 86_400_000;
  const expired = open.filter((t) => Date.parse(t.postedAt) < expireBefore);
  const live = open.filter((t) => Date.parse(t.postedAt) >= expireBefore);

  let ready = new Set<string>();
  if (live.length > 0) {
    try {
      ready = await tasksReady(creds, opts.fetchFn);
    } catch (err) {
      errors.push(`tasks_ready: ${message(err)}`);
    }
  }
  const staleBefore = nowMs - COLLECT.staleAfterMinutes * 60_000;
  const candidates = [
    ...live.filter((t) => ready.has(t.id)),
    ...live.filter((t) => !ready.has(t.id) && Date.parse(t.postedAt) < staleBefore),
  ].slice(0, batch);

  const summary: CollectSummary = {
    runId: null,
    open: open.length,
    fetched: 0,
    done: 0,
    noResults: 0,
    failed: 0,
    stillPending: 0,
    expired: expired.length,
    snapshots: 0,
    dailyRows: 0,
    statsUpdated: 0,
    errors,
  };
  if (candidates.length === 0 && expired.length === 0 && errors.length === 0) return summary;

  const runId = await store.startRun('collect', env.APP_ENV, now.toISOString());
  summary.runId = runId;
  try {
    const items: { task: OpenTask; outcome: TaskOutcome }[] = [];
    for (const task of candidates) {
      try {
        items.push({ task, outcome: taskOutcome(await taskGet(task.id, creds, opts.fetchFn)) });
        summary.fetched++;
      } catch (err) {
        // Left `posted`: retried next run, failed after COLLECT.expireAfterDays.
        errors.push(`task ${task.id}: ${message(err)}`);
      }
    }

    const aliases = await store.providerAliases();
    const payload = buildIngest(items, aliases, now.toISOString());
    for (const t of payload.tasks) {
      if (t.status === 'done') summary.done++;
      else if (t.status === 'no_results') summary.noResults++;
      else summary.failed++;
    }
    for (const t of expired) {
      payload.tasks.push({
        id: t.id,
        status: 'failed',
        error: `no result within ${COLLECT.expireAfterDays} days`,
      });
    }
    summary.stillPending = items.filter((i) => i.outcome.kind === 'pending').length;
    for (const i of items) {
      if (i.outcome.kind === 'failed') errors.push(`task ${i.task.id}: ${i.outcome.error}`);
    }

    if (payload.tasks.length > 0) {
      const written = await store.ingest(payload);
      summary.snapshots = written.snapshots;
      summary.dailyRows = written.dailyRows;
    }

    const touched = new Map<number, string>();
    const withSnapshots = new Set(payload.snapshots.map((s) => s.stay_id));
    for (const { task } of items) {
      if (withSnapshots.has(task.stayId)) touched.set(task.stayId, task.checkIn);
    }
    summary.statsUpdated = await refreshStats(store, touched, now);

    await store.finishRun(runId, {
      finishedAt: new Date().toISOString(),
      tasksDone: summary.done,
      errors,
    });
    return summary;
  } catch (err) {
    errors.push(`run failed: ${message(err)}`);
    await store.finishRun(runId, { finishedAt: new Date().toISOString(), errors });
    throw err;
  }
}

/** Recomputes `stay_stats` from `stay_daily` (PLAN §8.1) for the given stays (id → check-in). */
export async function refreshStats(
  store: CollectorStore,
  stays: ReadonlyMap<number, string>,
  now: Date,
): Promise<number> {
  if (stays.size === 0) return 0;
  const today = toIsoDate(now.getTime());
  const from = addDays(today, -(STATS.windowDays - 1));
  const series = await store.dailySeries([...stays.keys()], from);
  const rows: StayStatsRow[] = [];
  for (const [stayId, checkIn] of stays) {
    const s = computeStayStats(
      series.filter((p) => p.stayId === stayId),
      today,
      checkIn,
    );
    rows.push({
      stay_id: stayId,
      updated_at: now.toISOString(),
      days_tracked: s.daysTracked,
      now_cents: s.nowCents,
      low_cents: s.lowCents,
      high_cents: s.highCents,
      avg30_cents: s.avg30Cents,
      percentile: s.percentile,
      trend_7d: s.trend7d,
      state: s.state,
    });
  }
  await store.upsertStats(rows);
  return rows.length;
}
