import { MONTHLY_ALERT_SHARE } from './budget';

/**
 * Data health verdict for /admin (C-016): one level Zaid can read on his phone in 10 seconds,
 * plus the reasons. Pure; the numbers come from the SQL function `admin_health()`.
 */

export type HealthLevel = 'ok' | 'warn' | 'bad';

export type HealthKey =
  | 'noRuns'
  | 'runLate'
  | 'coverageLow'
  | 'coveragePartial'
  | 'errors'
  | 'skipped'
  | 'budgetOver'
  | 'budgetHigh'
  | 'staleHotels';

export interface HealthCheck {
  key: HealthKey;
  level: Exclude<HealthLevel, 'ok'>;
  /** Numbers for the message, e.g. `{ have: 300, total: 396 }`. */
  values: Record<string, number>;
}

export interface HealthInput {
  now: Date;
  lastRunAt: string | null;
  /** Today's production totals (German date); null before the first run of the day. */
  today: { errors: number; skipped: number; budgetReason: string | null } | null;
  coverage: { stays: number; withToday: number; withYesterday: number };
  monthCostUsd: number;
  monthlyBudgetUsd: number;
  staleHotels: number;
}

export const HEALTH = {
  /** The morning run finishes around 07:30; from 09:00 today's prices must be there. */
  morningDoneHour: 9,
  /** No production run for this long means the schedule stopped. */
  runMaxAgeHours: 26,
  /** Share of active stays with a price: below `bad` is broken, below `warn` is patchy. */
  coverageBad: 0.5,
  coverageWarn: 0.9,
} as const;

function berlinHour(now: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(now);
  return Number(hour);
}

export function healthVerdict(input: HealthInput): { level: HealthLevel; checks: HealthCheck[] } {
  const checks: HealthCheck[] = [];
  const add = (key: HealthKey, level: HealthCheck['level'], values: Record<string, number> = {}) =>
    checks.push({ key, level, values });

  if (!input.lastRunAt) {
    add('noRuns', 'bad');
  } else {
    const hours = Math.floor((input.now.getTime() - Date.parse(input.lastRunAt)) / 3_600_000);
    if (hours >= HEALTH.runMaxAgeHours) add('runLate', 'bad', { hours });
  }

  const { stays, withToday, withYesterday } = input.coverage;
  if (stays > 0 && input.lastRunAt) {
    const morningDone = berlinHour(input.now) >= HEALTH.morningDoneHour;
    const have = morningDone ? withToday : withYesterday;
    const share = have / stays;
    const values = { have, total: stays, today: morningDone ? 1 : 0 };
    if (share < HEALTH.coverageBad) add('coverageLow', 'bad', values);
    else if (share < HEALTH.coverageWarn) add('coveragePartial', 'warn', values);
  }

  if (input.today && input.today.errors > 0) add('errors', 'warn', { count: input.today.errors });
  if (
    input.today &&
    input.today.skipped > 0 &&
    (input.today.budgetReason === 'daily_cap' || input.today.budgetReason === 'monthly_budget')
  ) {
    add('skipped', 'warn', { count: input.today.skipped });
  }

  const budget = input.monthlyBudgetUsd;
  if (budget > 0) {
    const values = { spent: input.monthCostUsd, budget };
    if (input.monthCostUsd >= budget) add('budgetOver', 'bad', values);
    else if (input.monthCostUsd >= budget * MONTHLY_ALERT_SHARE) add('budgetHigh', 'warn', values);
  }

  if (input.staleHotels > 0) add('staleHotels', 'warn', { count: input.staleHotels });

  checks.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
  const level: HealthLevel = checks.some((c) => c.level === 'bad')
    ? 'bad'
    : checks.length > 0
      ? 'warn'
      : 'ok';
  return { level, checks };
}
