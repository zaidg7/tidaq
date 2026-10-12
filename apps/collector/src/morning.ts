import {
  applyBudget,
  buildGrid,
  COST_PER_TASK_USD,
  defaultSpecialStays,
  eveningJobs,
  gridConfigFromEnv,
  toIsoDate,
  z,
  type BudgetReason,
} from '@tidaq/core';
import { postHotelInfoTasks, type FetchFn } from './dataforseo';
import type { Env } from './env';
import type { CollectorStore, RunKind } from './store';

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

    const allJobs = await store.stayJobs(today);
    const jobs = kind === 'evening' ? eveningJobs(allJobs, today) : allJobs;
    const usage = await store.usage(today);
    const budget = applyBudget(jobs, today, {
      dailyCap: limits.DAILY_TASK_CAP,
      postedToday: usage.postedToday,
      monthlyBudgetUsd: limits.MONTHLY_BUDGET_USD,
      spentThisMonthUsd: usage.spentThisMonthUsd,
      costPerTaskUsd: COST_PER_TASK_USD,
    });

    const result = await postHotelInfoTasks(
      budget.selected.map((j) => ({
        hotelIdentifier: j.hotelIdentifier,
        checkIn: j.checkIn,
        checkOut: j.checkOut,
        adults: j.adults,
        stayId: j.stayId,
      })),
      { login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD },
      opts.fetchFn,
    );
    await store.recordTasks(runId, result.posted);
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
      errors,
    });

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
      errors,
    };
  } catch (err) {
    errors.push(`run failed: ${err instanceof Error ? err.message : String(err)}`);
    await store.finishRun(runId, { finishedAt: new Date().toISOString(), errors });
    throw err;
  }
}
