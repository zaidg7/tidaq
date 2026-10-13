import { describe, expect, it } from 'vitest';
import { healthVerdict, type HealthInput } from './health';

// 14:00 in Berlin (CEST, UTC+2).
const afternoon = new Date('2026-10-13T12:00:00Z');
// 07:00 in Berlin: the morning run may still be going.
const early = new Date('2026-10-13T05:00:00Z');

const healthy: HealthInput = {
  now: afternoon,
  lastRunAt: '2026-10-13T07:21:00Z',
  today: { errors: 0, skipped: 0, budgetReason: 'ok' },
  coverage: { stays: 400, withToday: 390, withYesterday: 380 },
  monthCostUsd: 3,
  monthlyBudgetUsd: 12,
  staleHotels: 0,
};

const keys = (input: HealthInput) => healthVerdict(input).checks.map((c) => c.key);

describe('healthVerdict', () => {
  it('is ok when everything is in place', () => {
    expect(healthVerdict(healthy)).toEqual({ level: 'ok', checks: [] });
  });

  it('is bad without any run, and skips coverage then', () => {
    const v = healthVerdict({ ...healthy, lastRunAt: null, today: null });
    expect(v.level).toBe('bad');
    expect(v.checks.map((c) => c.key)).toEqual(['noRuns']);
  });

  it('is bad when the schedule stopped', () => {
    const v = healthVerdict({ ...healthy, lastRunAt: '2026-10-12T08:00:00Z' });
    expect(v.checks[0]).toEqual({ key: 'runLate', level: 'bad', values: { hours: 28 } });
  });

  it('judges today’s coverage after 09:00 and yesterday’s before', () => {
    const thin = { stays: 400, withToday: 100, withYesterday: 390 };
    expect(keys({ ...healthy, coverage: thin })).toEqual(['coverageLow']);
    expect(keys({ ...healthy, now: early, coverage: thin })).toEqual([]);
    const patchy = { stays: 400, withToday: 300, withYesterday: 300 };
    expect(healthVerdict({ ...healthy, coverage: patchy }).checks[0]).toEqual({
      key: 'coveragePartial',
      level: 'warn',
      values: { have: 300, total: 400, today: 1 },
    });
    expect(healthVerdict({ ...healthy, now: early, coverage: patchy }).checks[0]?.values).toEqual({
      have: 300,
      total: 400,
      today: 0,
    });
  });

  it('ignores coverage when nothing is tracked', () => {
    expect(keys({ ...healthy, coverage: { stays: 0, withToday: 0, withYesterday: 0 } })).toEqual(
      [],
    );
  });

  it('warns about errors and stays the budget guard skipped', () => {
    const v = healthVerdict({
      ...healthy,
      today: { errors: 3, skipped: 20, budgetReason: 'daily_cap' },
    });
    expect(v.level).toBe('warn');
    expect(v.checks.map((c) => c.key)).toEqual(['errors', 'skipped']);
    expect(keys({ ...healthy, today: { errors: 0, skipped: 5, budgetReason: 'ok' } })).toEqual([]);
  });

  it('watches the monthly budget', () => {
    expect(keys({ ...healthy, monthCostUsd: 10 })).toEqual(['budgetHigh']);
    expect(healthVerdict({ ...healthy, monthCostUsd: 12 }).level).toBe('bad');
    expect(keys({ ...healthy, monthlyBudgetUsd: 0, monthCostUsd: 50 })).toEqual([]);
  });

  it('lists bad checks first', () => {
    const v = healthVerdict({ ...healthy, staleHotels: 2, monthCostUsd: 13 });
    expect(v.level).toBe('bad');
    expect(v.checks.map((c) => c.key)).toEqual(['budgetOver', 'staleHotels']);
  });
});
