import {
  applyBudget,
  buildGrid,
  COST_PER_TASK_USD,
  defaultSpecialStays,
  eveningJobs,
  gridConfigFromEnv,
  MONTHLY_ALERT_SHARE,
  REQUEST_RESERVE,
  toIsoDate,
  xoteloTaskId,
  z,
  type BudgetReason,
} from '@tidaq/core';
import { postHotelInfoTasks, type FetchFn } from './dataforseo';
import { priceSource, type Env } from './env';
import type { CollectorStore, RunKind, StayJob } from './store';

export interface PostRunSummary {
  runId: number;
  kind: RunKind;
  today: string;
  gridStaysInserted: number;
  staysDeactivated: number;
  jobs: number;
  posted: number;
  skipped: number;
  budgetReason: BudgetReason;
  estCostUsd: number;
  monthlyAlert: boolean;
  /** Estimated spend this month including this run. */
  monthSpendUsd: number;
  /** This run moved the month past 80 % of the budget (alert once, not every day). */
  monthlyAlertCrossed: boolean;
  errors: string[];
}

const limitsSchema = z.object({
  DAILY_TASK_CAP: z.coerce.number().int().min(0).max(5000),
  MONTHLY_BUDGET_USD: z.coerce.number().min(0).max(500),
});

/**
 * Morning (and evening) run, C-013a: refresh the stay grid, then post one Hotel Info task per
 * active stay that fits the budget guard. Results are collected later by the collect run (C-013b).
 * Invalid budget settings throw before anything is posted.
 */
export async function runPosting(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  kind: Exclude<RunKind, 'collect'>;
  fetchFn?: FetchFn;
}): Promise<PostRunSummary> {
  const { store, env, now, kind } = opts;
  const today = toIsoDate(now.getTime());
  const limits = limitsSchema.parse(env);
  const grid = gridConfigFromEnv({
    GRID_WEEKENDS: env.GRID_WEEKENDS,
    GRID_MIDWEEK: env.GRID_MIDWEEK,
  });
  const runId = await store.startRun(kind, env.APP_ENV, now.toISOString());
  const errors: string[] = [];

  try {
    const hotels = await store.activeHotels();
    const stays = buildGrid(today, hotels, defaultSpecialStays(today), grid);
    const gridStaysInserted = await store.upsertGridStays(stays);
    const staysDeactivated = await store.deactivatePastStays(today);

    const allJobs = forSource(await store.stayJobs(today), env);
    const jobs = kind === 'evening' ? eveningJobs(allJobs, today) : allJobs;
    const usage = await store.usage(today);
    const { budget, result } = await postWithinBudget(
      store,
      env,
      runId,
      jobs,
      today,
      usage,
      limits,
      opts.fetchFn,
      // Leave room for stays visitors open later today (C-132a).
      REQUEST_RESERVE,
    );
    errors.push(...result.errors.map((e) => `stay ${e.stayId}: ${e.message}`));

    // Sum in micro-dollars: float sums of 0.0008 drift (0.0088000000002).
    const estCostUsd =
      result.posted.reduce((sum, t) => sum + Math.round(t.costUsd * 1_000_000), 0) / 1_000_000;
    await store.finishRun(runId, {
      finishedAt: new Date().toISOString(),
      tasksPosted: result.posted.length,
      tasksSkipped: budget.skipped.length,
      estCostUsd,
      budgetReason: budget.reason,
      dailyCap: limits.DAILY_TASK_CAP,
      errors,
    });

    const micros = (usd: number) => Math.round(usd * 1_000_000);
    const before = micros(usage.spentThisMonthUsd);
    const after = before + micros(estCostUsd);
    const threshold = micros(limits.MONTHLY_BUDGET_USD) * MONTHLY_ALERT_SHARE;

    return {
      runId,
      kind,
      today,
      gridStaysInserted,
      staysDeactivated,
      jobs: jobs.length,
      posted: result.posted.length,
      skipped: budget.skipped.length,
      budgetReason: budget.reason,
      estCostUsd,
      monthlyAlert: budget.monthlyAlert,
      monthSpendUsd: after / 1_000_000,
      monthlyAlertCrossed: before <= threshold && after > threshold,
      errors,
    };
  } catch (err) {
    errors.push(`run failed: ${err instanceof Error ? err.message : String(err)}`);
    await store.finishRun(runId, { finishedAt: new Date().toISOString(), errors });
    throw err;
  }
}

/** Only stays whose hotel has an id at the active source (D-41). */
function forSource(jobs: StayJob[], env: Env): StayJob[] {
  const source = priceSource(env);
  return jobs.filter((j) =>
    source === 'xotelo' ? j.xoteloKey !== null : j.hotelIdentifier !== null,
  );
}

/**
 * The budget guard (hard rule 4) plus posting, shared by every run that creates tasks. Xotelo
 * answers right away, so its "tasks" are local queue entries the collect runs work through;
 * DataForSEO tasks are posted and polled (D-39). Recorded under `runId`. `reserve` tasks of the
 * daily cap stay unused (the scheduled runs keep them for visitor requests).
 */
async function postWithinBudget(
  store: CollectorStore,
  env: Env,
  runId: number,
  jobs: readonly StayJob[],
  today: string,
  usage: { postedToday: number; spentThisMonthUsd: number },
  limits: z.infer<typeof limitsSchema>,
  fetchFn: FetchFn | undefined,
  reserve: number,
) {
  const source = priceSource(env);
  const budget = applyBudget(jobs, today, {
    dailyCap: Math.max(0, limits.DAILY_TASK_CAP - reserve),
    postedToday: usage.postedToday,
    monthlyBudgetUsd: limits.MONTHLY_BUDGET_USD,
    spentThisMonthUsd: usage.spentThisMonthUsd,
    // Xotelo is free: only the daily cap limits it (and keeps us gentle on the service).
    costPerTaskUsd: source === 'xotelo' ? 0 : COST_PER_TASK_USD,
  });
  const result =
    source === 'xotelo'
      ? {
          posted: budget.selected.map((j) => ({
            id: xoteloTaskId(runId, j.stayId),
            stayId: j.stayId,
            costUsd: 0,
          })),
          errors: [] as { stayId: number; message: string }[],
        }
      : await postHotelInfoTasks(
          budget.selected.map((j) => ({
            hotelIdentifier: j.hotelIdentifier as string,
            checkIn: j.checkIn,
            checkOut: j.checkOut,
            adults: j.adults,
            stayId: j.stayId,
          })),
          { login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD },
          fetchFn,
        );
  await store.recordTasks(runId, result.posted);
  return { budget, result };
}

export interface RequestRunSummary {
  /** Null when no requested stay was waiting (no run row is written then). */
  runId: number | null;
  waiting: number;
  posted: number;
  skipped: number;
  budgetReason: BudgetReason | null;
  errors: string[];
}

/**
 * Request run (C-022c1): stays a visitor asked for (`request_stay()`, origin `watch`) that never
 * had a task get one now, inside the same budget guard, so the collect run that follows prices
 * them within minutes instead of the next morning. Without waiting stays it costs one query.
 */
export async function runRequests(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<RequestRunSummary> {
  const { store, env, now } = opts;
  const today = toIsoDate(now.getTime());
  const limits = limitsSchema.parse(env);
  const jobs = forSource(await store.requestedStayJobs(today), env);
  if (jobs.length === 0) {
    return { runId: null, waiting: 0, posted: 0, skipped: 0, budgetReason: null, errors: [] };
  }

  const runId = await store.startRun('request', env.APP_ENV, now.toISOString());
  const errors: string[] = [];
  try {
    const usage = await store.usage(today);
    const { budget, result } = await postWithinBudget(
      store,
      env,
      runId,
      jobs,
      today,
      usage,
      limits,
      opts.fetchFn,
      0,
    );
    errors.push(...result.errors.map((e) => `stay ${e.stayId}: ${e.message}`));
    const estCostUsd =
      result.posted.reduce((sum, t) => sum + Math.round(t.costUsd * 1_000_000), 0) / 1_000_000;
    await store.finishRun(runId, {
      finishedAt: new Date().toISOString(),
      tasksPosted: result.posted.length,
      tasksSkipped: budget.skipped.length,
      estCostUsd,
      budgetReason: budget.reason,
      dailyCap: limits.DAILY_TASK_CAP,
      errors,
    });
    return {
      runId,
      waiting: jobs.length,
      posted: result.posted.length,
      skipped: budget.skipped.length,
      budgetReason: budget.reason,
      errors,
    };
  } catch (err) {
    errors.push(`run failed: ${err instanceof Error ? err.message : String(err)}`);
    await store.finishRun(runId, { finishedAt: new Date().toISOString(), errors });
    throw err;
  }
}
