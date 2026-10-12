import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeStayStats, STATS, type DailyPrice } from './stats';

const TODAY = '2026-10-12';
const FAR = '2026-12-01';

/** Builds a daily series ending today from oldest to newest prices (in euros). */
function series(euros: number[], end = TODAY): DailyPrice[] {
  return euros.map((e, i) => ({ day: addDays(end, i - euros.length + 1), bestCents: e * 100 }));
}

describe('computeStayStats basics', () => {
  it('returns collecting without data', () => {
    const s = computeStayStats([], TODAY, FAR);
    expect(s).toMatchObject({
      daysTracked: 0,
      nowCents: null,
      state: 'collecting',
      advice: 'collecting',
    });
  });

  it('handles a single point', () => {
    const s = computeStayStats(series([500]), TODAY, FAR);
    expect(s).toMatchObject({
      daysTracked: 1,
      nowCents: 50000,
      lowCents: 50000,
      highCents: 50000,
      avg30Cents: 50000,
      percentile: null,
      trend7d: null,
      trend: null,
      state: 'collecting',
    });
  });

  it('stays collecting with 6 days and decides with 7', () => {
    expect(computeStayStats(series([5, 5, 5, 5, 5, 5].map((x) => x * 100)), TODAY, FAR).state).toBe(
      'collecting',
    );
    expect(
      computeStayStats(series([5, 5, 5, 5, 5, 5, 5].map((x) => x * 100)), TODAY, FAR).state,
    ).not.toBe('collecting');
    expect(STATS.minDays).toBe(7);
  });

  it('treats a flat series as near the low', () => {
    const s = computeStayStats(series(Array(20).fill(600)), TODAY, FAR);
    expect(s).toMatchObject({
      state: 'near_low',
      advice: 'near_low',
      trend: 'flat',
      percentile: 0.5,
    });
    expect(s.trend7d).toBe(0);
  });
});

describe('computeStayStats states', () => {
  it('falling series ends at the low', () => {
    const s = computeStayStats(
      series([700, 690, 680, 670, 660, 650, 640, 630, 620, 610]),
      TODAY,
      FAR,
    );
    expect(s.state).toBe('near_low');
    expect(s.trend).toBe('falling');
    expect(s.trend7d).toBeLessThan(-1.5);
    expect(s.percentile).toBe(0);
  });

  it('rising series ends high', () => {
    const s = computeStayStats(
      series([500, 510, 520, 530, 540, 550, 560, 570, 580, 590]),
      TODAY,
      FAR,
    );
    expect(s).toMatchObject({ state: 'high', advice: 'high', trend: 'rising', percentile: 1 });
    expect(s.highCents).toBe(59000);
  });

  it('good and falling', () => {
    // Today 600 sits low but not at the bottom; the last week falls.
    const prices = [560, 570, 580, 650, 700, 720, 710, 690, 670, 650, 630, 610, 600];
    const s = computeStayStats(series(prices), TODAY, FAR);
    expect(s.percentile).toBeCloseTo(3 / 12, 5);
    expect(s).toMatchObject({ state: 'good', trend: 'falling', advice: 'good_falling' });
  });

  it('good and flat', () => {
    // 12 days at 700, one at 550, then a flat week at 600: low percentile (≈ 0.21), not near the low.
    const prices = [...Array(12).fill(700), 550, ...Array(7).fill(600)];
    const s = computeStayStats(series(prices), TODAY, FAR);
    expect(s.percentile).toBeCloseTo(4 / 19, 5);
    expect(s).toMatchObject({ state: 'good', advice: 'good', trend: 'flat' });
  });

  it('normal, and normal falling', () => {
    const flat = computeStayStats(
      series([500, 520, 540, 600, 620, 640, 660, ...Array(7).fill(560)]),
      TODAY,
      FAR,
    );
    expect(flat.percentile).toBeCloseTo(6 / 13, 5);
    expect(flat).toMatchObject({ state: 'normal', advice: 'normal', trend: 'flat' });
    const falling = computeStayStats(
      series([500, 520, 540, 560, 580, 700, 690, 680, 660, 640, 620, 600, 580]),
      TODAY,
      FAR,
    );
    expect(falling).toMatchObject({ state: 'normal', advice: 'normal_falling', trend: 'falling' });
  });

  it('near-low boundary: 2 % above the low counts, 2.1 % does not', () => {
    const base = [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000];
    const at = computeStayStats(series([...base, 1020]), TODAY, FAR);
    expect(at.state).toBe('near_low');
    // 1021 € is 2.1 % above the low but its percentile is 1/11 ≈ 0.09 → still near_low by percentile.
    const byPercentile = computeStayStats(series([...base, 1021]), TODAY, FAR);
    expect(byPercentile.percentile).toBeCloseTo(1 / 11, 5);
    expect(byPercentile.state).toBe('near_low');
    // With more history the percentile rises above 0.10 and the 2.1 % price is only "good".
    const longer = [1000, 1010, 1010, 1010, ...base.slice(1)];
    const good = computeStayStats(series([...longer, 1021]), TODAY, FAR);
    expect(good.percentile).toBeCloseTo(4 / 14, 5);
    expect(good.state).toBe('good');
  });

  it('a one-day spike does not make today expensive', () => {
    const prices = [600, 600, 600, 1800, 600, 600, 600, 600, 600, 600];
    const s = computeStayStats(series(prices), TODAY, FAR);
    expect(s.highCents).toBe(180000);
    expect(s.state).toBe('near_low');
  });
});

describe('computeStayStats window and data quality', () => {
  it('ignores days older than 60 days and in the future', () => {
    const old = { day: addDays(TODAY, -60), bestCents: 10_000 };
    const future = { day: addDays(TODAY, 1), bestCents: 1 };
    const s = computeStayStats([old, future, ...series(Array(10).fill(500))], TODAY, FAR);
    expect(s.daysTracked).toBe(10);
    expect(s.lowCents).toBe(50000);
  });

  it('averages only the last 30 days', () => {
    const prices = [...Array(30).fill(1000), ...Array(30).fill(500)];
    const s = computeStayStats(series(prices), TODAY, FAR);
    expect(s.daysTracked).toBe(60);
    expect(s.avg30Cents).toBe(50000);
  });

  it('accepts unsorted input with gaps and keeps the lowest price per day', () => {
    const points: DailyPrice[] = [
      { day: TODAY, bestCents: 50000 },
      { day: addDays(TODAY, -10), bestCents: 60000 },
      { day: TODAY, bestCents: 49000 },
      { day: addDays(TODAY, -3), bestCents: 55000 },
    ];
    const s = computeStayStats(points, TODAY, FAR);
    expect(s).toMatchObject({ daysTracked: 3, nowCents: 49000, nowDay: TODAY });
    expect(s.trend).toBe('falling');
  });

  it('flags stale data', () => {
    const s = computeStayStats(series(Array(10).fill(500), addDays(TODAY, -3)), TODAY, FAR);
    expect(s.stale).toBe(true);
    expect(s.nowDay).toBe(addDays(TODAY, -3));
    expect(computeStayStats(series([500]), TODAY, FAR).stale).toBe(false);
  });

  it('rejects invalid prices', () => {
    expect(() => computeStayStats([{ day: TODAY, bestCents: 0 }], TODAY, FAR)).toThrow(RangeError);
    expect(() => computeStayStats([{ day: TODAY, bestCents: 12.5 }], TODAY, FAR)).toThrow(
      RangeError,
    );
  });

  it('cannot compute a trend from a single recent day', () => {
    const points = [
      { day: addDays(TODAY, -20), bestCents: 50000 },
      { day: TODAY, bestCents: 50000 },
    ];
    expect(computeStayStats(points, TODAY, FAR).trend).toBeNull();
  });
});

describe('computeStayStats check-in note', () => {
  it('sets soon within 7 days of check-in, not after it', () => {
    const data = series(Array(10).fill(500));
    expect(computeStayStats(data, TODAY, addDays(TODAY, 7)).soon).toBe(true);
    expect(computeStayStats(data, TODAY, TODAY).soon).toBe(true);
    expect(computeStayStats(data, TODAY, addDays(TODAY, 8)).soon).toBe(false);
    expect(computeStayStats(data, TODAY, addDays(TODAY, -1)).soon).toBe(false);
    expect(computeStayStats([], TODAY, addDays(TODAY, 3)).soon).toBe(true);
  });
});
