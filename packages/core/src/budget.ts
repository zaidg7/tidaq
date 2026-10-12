import { daysBetween } from './dates';

/** One stay to price in a collector run. */
export interface CollectJob {
  stayId: number;
  checkIn: string;
  /** Someone watches this stay: it is priced first (PLAN §7.2). */
  watched: boolean;
}

export interface BudgetLimits {
  /** `DAILY_TASK_CAP`. */
  dailyCap: number;
  /** Tasks already posted today (UTC). */
  postedToday: number;
  /** `MONTHLY_BUDGET_USD`. */
  monthlyBudgetUsd: number;
  /** Estimated spend so far this month (from `collector_runs.est_cost_usd`). */
  spentThisMonthUsd: number;
  /** Price of one task. Hotel Info, standard queue: $0.0008 (C-010). */
  costPerTaskUsd: number;
}

export type BudgetReason = 'ok' | 'daily_cap' | 'monthly_budget';

export interface BudgetResult<J extends CollectJob> {
  selected: J[];
  skipped: J[];
  /** What limited the run. `ok` = nothing was cut. */
  reason: BudgetReason;
  estCostUsd: number;
  /** Month-to-date spend including this run is above 80 % of the budget: tell Zaid. */
  monthlyAlert: boolean;
}

/** DataForSEO Hotel Info, standard queue (C-010). */
export const COST_PER_TASK_USD = 0.0008;
/** Share of the monthly budget at which Zaid gets an email (C-013 step 5). */
export const MONTHLY_ALERT_SHARE = 0.8;
/** Evening run: only stays checking in within this many days, plus watched stays (C-013 step 3). */
export const EVENING_WINDOW_DAYS = 21;

// Money in micro-dollars, so the guard never rounds a task over the limit.
const micros = (usd: number): number => Math.round(usd * 1_000_000);

/** Watched stays first, then the nearest check-in, then the oldest stay (stable). */
export function prioritizeJobs<J extends CollectJob>(jobs: readonly J[]): J[] {
  return [...jobs].sort(
    (a, b) =>
      Number(b.watched) - Number(a.watched) ||
      a.checkIn.localeCompare(b.checkIn) ||
      a.stayId - b.stayId,
  );
}

/**
 * The budget guard (PLAN §7.2, CLAUDE.md hard rule 4). Pure. Keeps the highest-priority jobs that
 * fit both the daily task cap and the remaining monthly budget; past check-ins are dropped.
 */
export function applyBudget<J extends CollectJob>(
  jobs: readonly J[],
  today: string,
  limits: BudgetLimits,
): BudgetResult<J> {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Budget limit ${name} must be a non-negative number, got ${value}`);
    }
  }
  if (limits.costPerTaskUsd === 0) throw new RangeError('costPerTaskUsd must be > 0');

  const upcoming = jobs.filter((j) => daysBetween(today, j.checkIn) >= 0);
  const ordered = prioritizeJobs(upcoming);

  const byDay = Math.max(0, Math.floor(limits.dailyCap) - limits.postedToday);
  const leftMicros = micros(limits.monthlyBudgetUsd) - micros(limits.spentThisMonthUsd);
  const byMonth = Math.max(0, Math.floor(leftMicros / micros(limits.costPerTaskUsd)));
  const allowed = Math.min(byDay, byMonth);

  const selected = ordered.slice(0, allowed);
  const skipped = [...ordered.slice(allowed), ...jobs.filter((j) => !upcoming.includes(j))];
  const reason: BudgetReason =
    ordered.length <= allowed ? 'ok' : byDay <= byMonth ? 'daily_cap' : 'monthly_budget';
  const estMicros = selected.length * micros(limits.costPerTaskUsd);

  return {
    selected,
    skipped,
    reason,
    estCostUsd: estMicros / 1_000_000,
    monthlyAlert:
      micros(limits.spentThisMonthUsd) + estMicros >
      micros(limits.monthlyBudgetUsd) * MONTHLY_ALERT_SHARE,
  };
}

/** Jobs for the evening run: check-in within 21 days, or watched. */
export function eveningJobs<J extends CollectJob>(jobs: readonly J[], today: string): J[] {
  return jobs.filter((j) => j.watched || daysBetween(today, j.checkIn) <= EVENING_WINDOW_DAYS);
}
