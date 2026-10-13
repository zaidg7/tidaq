import {
  applyBudget,
  buildGrid,
  COST_PER_TASK_USD,
  defaultSpecialStays,
  eveningJobs,
  gridConfigFromEnv,
  MONTHLY_ALERT_SHARE,
  toIsoDate,
  xoteloTaskId,
  z,
  type BudgetReason,
} from '@tidaq/core';
import { postHotelInfoTasks, type FetchFn } from './dataforseo';
import { priceSource, type Env } from './env';
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

    // Only stays whose hotel has an id at the active source (D-41).
    const source = priceSource(env);
    const allJobs = (await store.stayJobs(today)).filter((j) =>
      source === 'xotelo' ? j.xoteloKey !== null : j.hotelIdentifier !== null,
    );
    const jobs = kind === 'evening' ? eveningJobs(allJobs, today) : allJobs;
    const usage = await store.usage(today);
    const budget = applyBudget(jobs, today, {
      dailyCap: limits.DAILY_TASK_CAP,
      postedToday: usage.postedToday,
      monthlyBudgetUsd: limits.MONTHLY_BUDGET_USD,
      spentThisMonthUsd: usage.spentThisMonthUsd,
      // Xotelo is free: only the daily cap limits it (and keeps us gentle on the service).
      costPerTaskUsd: source === 'xotelo' ? 0 : COST_PER_TASK_USD,
    });

    // Xotelo answers right away, so its "tasks" are local queue entries the collect runs work
    // through; DataForSEO tasks are posted and polled (D-39).
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
