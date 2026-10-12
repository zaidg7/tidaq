import { describe, expect, it } from 'vitest';
import {
  applyBudget,
  COST_PER_TASK_USD,
  eveningJobs,
  prioritizeJobs,
  type BudgetLimits,
  type CollectJob,
} from './budget';

const TODAY = '2026-10-12';
const limits = (over: Partial<BudgetLimits> = {}): BudgetLimits => ({
  dailyCap: 300,
  postedToday: 0,
  monthlyBudgetUsd: 12,
  spentThisMonthUsd: 0,
  costPerTaskUsd: COST_PER_TASK_USD,
  ...over,
});
const job = (stayId: number, checkIn: string, watched = false): CollectJob => ({
  stayId,
  checkIn,
  watched,
});

describe('prioritizeJobs', () => {
  it('puts watched stays first, then the nearest check-in, then the oldest stay', () => {
    const ordered = prioritizeJobs([
      job(5, '2026-11-20'),
      job(4, '2026-10-16'),
      job(3, '2026-12-30', true),
      job(2, '2026-10-16'),
      job(1, '2026-11-01', true),
    ]);
    expect(ordered.map((j) => j.stayId)).toEqual([1, 3, 2, 4, 5]);
  });
});

describe('applyBudget', () => {
  it('keeps everything when it fits', () => {
    const jobs = [job(1, '2026-10-16'), job(2, '2026-10-23')];
    const r = applyBudget(jobs, TODAY, limits());
    expect(r).toMatchObject({ reason: 'ok', skipped: [], monthlyAlert: false });
    expect(r.selected).toHaveLength(2);
    expect(r.estCostUsd).toBeCloseTo(0.0016, 10);
  });

  it('cuts at the daily cap in priority order (watches first, then nearest check-in)', () => {
    const jobs = [
      job(1, '2026-12-04'),
      job(2, '2026-10-16'),
      job(3, '2026-12-30', true),
      job(4, '2026-10-23'),
      job(5, '2026-11-13'),
    ];
    const r = applyBudget(jobs, TODAY, limits({ dailyCap: 3 }));
    expect(r.reason).toBe('daily_cap');
    expect(r.selected.map((j) => j.stayId)).toEqual([3, 2, 4]);
    expect(r.skipped.map((j) => j.stayId)).toEqual([5, 1]);
  });

  it('counts tasks already posted today', () => {
    const jobs = [job(1, '2026-10-16'), job(2, '2026-10-17'), job(3, '2026-10-18')];
    const r = applyBudget(jobs, TODAY, limits({ dailyCap: 300, postedToday: 299 }));
    expect(r.selected.map((j) => j.stayId)).toEqual([1]);
    expect(applyBudget(jobs, TODAY, limits({ postedToday: 400 })).selected).toEqual([]);
  });

  it('stops at the monthly budget', () => {
    const jobs = Array.from({ length: 10 }, (_, i) => job(i + 1, '2026-10-20'));
    // $12 budget, $11.9976 spent → 3 tasks of $0.0008 left.
    const r = applyBudget(jobs, TODAY, limits({ spentThisMonthUsd: 11.9976 }));
    expect(r.reason).toBe('monthly_budget');
    expect(r.selected).toHaveLength(3);
    expect(r.monthlyAlert).toBe(true);
    expect(applyBudget(jobs, TODAY, limits({ spentThisMonthUsd: 12.5 })).selected).toEqual([]);
  });

  it('alerts above 80 % of the monthly budget including this run', () => {
    const jobs = Array.from({ length: 300 }, (_, i) => job(i + 1, '2026-10-20'));
    expect(applyBudget(jobs, TODAY, limits({ spentThisMonthUsd: 9.36 })).monthlyAlert).toBe(false);
    expect(applyBudget(jobs, TODAY, limits({ spentThisMonthUsd: 9.37 })).monthlyAlert).toBe(true);
  });

  it('drops stays whose check-in has passed, keeps today', () => {
    const r = applyBudget([job(1, '2026-10-11'), job(2, TODAY)], TODAY, limits());
    expect(r.selected.map((j) => j.stayId)).toEqual([2]);
    expect(r.skipped.map((j) => j.stayId)).toEqual([1]);
  });

  it('a 36-hotel December grid (324 jobs) is cut to the cap of 300', () => {
    const jobs = Array.from({ length: 324 }, (_, i) =>
      job(i + 1, i % 9 === 8 ? '2026-12-30' : '2026-12-11'),
    );
    const r = applyBudget(jobs, '2026-12-01', limits());
    expect(r.selected).toHaveLength(300);
    expect(r.reason).toBe('daily_cap');
    // The farthest check-ins (NYE) are the ones cut.
    expect(r.skipped.every((j) => j.checkIn === '2026-12-30')).toBe(true);
  });

  it('rejects broken limits instead of posting without a guard', () => {
    expect(() => applyBudget([], TODAY, limits({ dailyCap: Number.NaN }))).toThrow(RangeError);
    expect(() => applyBudget([], TODAY, limits({ monthlyBudgetUsd: -1 }))).toThrow(RangeError);
    expect(() => applyBudget([], TODAY, limits({ costPerTaskUsd: 0 }))).toThrow(RangeError);
  });
});

describe('eveningJobs', () => {
  it('keeps stays within 21 days and all watched stays', () => {
    const jobs = [job(1, '2026-11-02'), job(2, '2026-11-03'), job(3, '2026-12-30', true)];
    expect(eveningJobs(jobs, TODAY).map((j) => j.stayId)).toEqual([1, 3]);
  });
});
