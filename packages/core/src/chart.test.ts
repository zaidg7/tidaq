import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { areaPath, CHART, chartGeometry, gridTicks, linePath, quantile } from './chart';
import type { DailyPrice } from './stats';

const FROM = '2026-09-01';
const TO = '2026-10-30';

/** `n` consecutive days from `start` with prices from `f(i)`. */
function days(start: string, n: number, f: (i: number) => number): DailyPrice[] {
  return Array.from({ length: n }, (_, i) => ({ day: addDays(start, i), bestCents: f(i) }));
}

describe('gridTicks', () => {
  it('gives 3–4 round euro lines for typical ranges', () => {
    for (const [lo, hi] of [
      [90_000, 123_000],
      [100_000, 150_000],
      [10_000, 20_000],
      [94_000, 106_000],
      [60_000, 65_000],
    ] as const) {
      const ticks = gridTicks(lo, hi);
      expect(ticks.length, `${lo}–${hi}`).toBeGreaterThanOrEqual(3);
      expect(ticks.length, `${lo}–${hi}`).toBeLessThanOrEqual(4);
      for (const t of ticks) {
        expect(t % 100).toBe(0);
        expect(t).toBeGreaterThanOrEqual(lo);
        expect(t).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('prefers the coarsest step that works', () => {
    expect(gridTicks(90_000, 123_000)).toEqual([90_000, 100_000, 110_000, 120_000]);
  });

  it('returns nothing for an empty domain', () => {
    expect(gridTicks(0, 0)).toEqual([]);
  });

  it('falls back to 2 lines when no step gives 3–4', () => {
    expect(gridTicks(100, 250)).toEqual([100, 200]);
  });
});

describe('chartGeometry', () => {
  it('maps every day of the window and keeps the order', () => {
    const series = days(FROM, 60, (i) => 120_000 - i * 100).reverse();
    const g = chartGeometry(series, { from: FROM, to: TO });
    expect(g.points).toHaveLength(60);
    expect(g.days).toHaveLength(60);
    expect(g.points[0]?.day).toBe(FROM);
    expect(g.points[0]?.x).toBeCloseTo(CHART.inset.left);
    expect(g.last?.x).toBeCloseTo(1 - CHART.inset.right);
    expect(g.lastIsCurrent).toBe(true);
    expect(g.sparse).toBe(false);
    expect(g.band).toBeNull();
    for (const p of g.points) {
      expect(p.y).toBeGreaterThanOrEqual(CHART.inset.top);
      expect(p.y).toBeLessThanOrEqual(g.baseY);
    }
  });

  it('leaves a little room below the low and above the high (C-177)', () => {
    const g = chartGeometry(
      days(FROM, 30, (i) => 100_000 + (i % 2) * 20_000),
      { from: FROM, to: TO },
    );
    expect(g.domain).toEqual({ min: 94_000, max: 126_000 });
    expect(g.yTicks.map((t) => t.cents)).toEqual([100_000, 110_000, 120_000]);
  });

  it('keeps a small wiggle flat (at least ±3 % of the average)', () => {
    const g = chartGeometry(
      days(FROM, 20, (i) => 100_000 + (i % 2) * 900),
      {
        from: FROM,
        to: TO,
        avgCents: 100_450,
      },
    );
    expect(g.domain.min).toBeLessThanOrEqual(Math.round(100_450 * 0.97));
    expect(g.domain.max).toBeGreaterThanOrEqual(Math.round(100_450 * 1.03));
    const ys = g.points.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.15);
    expect(g.avg?.cents).toBe(100_450);
  });

  it('keeps one outlier out of the domain and pins it to the edge', () => {
    const series = days(FROM, 60, (i) => 115_000 + (i % 7) * 1_000);
    series[30] = { day: series[30]?.day as string, bestCents: 520_000 };
    series[40] = { day: series[40]?.day as string, bestCents: 20_000 };
    const g = chartGeometry(series, { from: FROM, to: TO });
    expect(g.domain.max).toBeLessThan(130_000);
    const high = g.points.find((p) => p.cents === 520_000);
    const lowOut = g.points.find((p) => p.cents === 20_000);
    expect(high).toMatchObject({ outlier: 'high', y: CHART.inset.top });
    expect(lowOut).toMatchObject({ outlier: 'low', y: g.baseY });
    expect(g.low?.cents).toBe(115_000);
    // The line breaks around the outliers.
    expect(g.segments.map((s) => s.length)).toEqual([30, 9, 19]);
  });

  it('starts the axis at the first price: no empty days, no placeholder band (C-174)', () => {
    const g = chartGeometry(
      days('2026-10-27', 4, (i) => 115_000 + i * 500),
      { from: FROM, to: TO },
    );
    expect(g.sparse).toBe(true);
    expect(g.from).toBe('2026-10-27');
    expect(g.days).toHaveLength(4);
    expect(g.band).toBeNull();
    expect(g.points[0]?.x).toBeCloseTo(CHART.inset.left);
    expect(g.segments.map((s) => s.length)).toEqual([4]);
    expect(g.lastIsCurrent).toBe(true);
  });

  it('spans at least three days, so a lone price is not on the edge', () => {
    const g = chartGeometry([{ day: TO, bestCents: 100_000 }], { from: FROM, to: TO });
    expect(g.from).toBe('2026-10-28');
    expect(g.points[0]?.x).toBeCloseTo(1 - CHART.inset.right);
  });

  it('starts a longer series at its first price too', () => {
    const g = chartGeometry(
      days('2026-10-11', 20, (i) => 100_000 + i * 100),
      { from: FROM, to: TO },
    );
    expect(g.sparse).toBe(false);
    expect(g.from).toBe('2026-10-11');
  });

  it('shows no average for a sparse series (a 30-day mean of 3 days says little)', () => {
    const g = chartGeometry(
      days('2026-10-28', 3, () => 100_000),
      { from: FROM, to: TO, avgCents: 100_000 },
    );
    expect(g.avg).toBeNull();
  });

  it('keeps the window start when a sparse series began earlier', () => {
    const g = chartGeometry(
      [
        { day: '2026-10-01', bestCents: 100_000 },
        { day: '2026-10-30', bestCents: 101_000 },
      ],
      { from: FROM, to: TO },
    );
    expect(g.from).toBe('2026-10-01');
    expect(g.band).toBeNull();
  });

  it('flags stale data with a band since the last price', () => {
    const g = chartGeometry(
      days(FROM, 50, (i) => 100_000 + i * 100),
      { from: FROM, to: TO },
    );
    expect(g.lastIsCurrent).toBe(false);
    expect(g.band).toMatchObject({ kind: 'stale', since: '2026-10-20' });
    expect(g.band?.x1).toBeCloseTo(1 - CHART.inset.right);
  });

  it('treats yesterday as current (the morning run may be pending)', () => {
    const g = chartGeometry(
      days(FROM, 59, (i) => 100_000 + i * 10),
      { from: FROM, to: TO },
    );
    expect(g.lastIsCurrent).toBe(true);
    expect(g.band).toBeNull();
  });

  it('handles flat prices: no low marker, no average on the line, no grid line under it', () => {
    const g = chartGeometry(
      days(FROM, 20, () => 110_000),
      { from: FROM, to: TO, avgCents: 110_000 },
    );
    expect(g.flat).toBe(true);
    expect(g.low).toBeNull();
    expect(g.avg).toBeNull();
    expect(g.yTicks.map((t) => t.cents)).not.toContain(110_000);
    expect(Number.isFinite(g.points[0]?.y)).toBe(true);
  });

  it('handles a single point', () => {
    const g = chartGeometry([{ day: TO, bestCents: 50_000 }], { from: FROM, to: TO });
    expect(g.points).toHaveLength(1);
    expect(g.sparse).toBe(true);
    expect(g.last?.day).toBe(TO);
  });

  it('breaks the line at missing days and lists them as empty slots', () => {
    const series = [...days(FROM, 5, () => 90_000), ...days('2026-09-08', 4, () => 95_000)];
    const g = chartGeometry(series, { from: FROM, to: TO });
    expect(g.segments.map((s) => s.length)).toEqual([5, 4]);
    expect(g.days.find((d) => d.day === '2026-09-06')?.point).toBeNull();
  });

  it('marks the earliest lowest price', () => {
    const g = chartGeometry(
      [
        { day: '2026-09-10', bestCents: 80_000 },
        { day: '2026-09-11', bestCents: 70_000 },
        { day: '2026-09-12', bestCents: 70_000 },
      ],
      { from: FROM, to: TO },
    );
    expect(g.low?.day).toBe('2026-09-11');
  });

  it('ignores points outside the window and invalid prices', () => {
    const g = chartGeometry(
      [
        { day: '2026-08-31', bestCents: 1 },
        { day: '2026-09-02', bestCents: 90_000 },
        { day: '2026-09-03', bestCents: Number.NaN },
        { day: '2026-10-31', bestCents: 1 },
      ],
      { from: FROM, to: TO },
    );
    expect(g.points.map((p) => p.day)).toEqual(['2026-09-02']);
  });

  it('returns axes but no marks without data', () => {
    const g = chartGeometry([], { from: FROM, to: TO });
    expect(g.points).toEqual([]);
    expect(g.low).toBeNull();
    expect(g.last).toBeNull();
    expect(g.avg).toBeNull();
    expect(g.yTicks).toEqual([]);
    expect(g.band).toBeNull();
    expect(g.xTicks.map((t) => t.day)).toEqual([
      '2026-09-01',
      '2026-09-21',
      '2026-10-10',
      '2026-10-30',
    ]);
  });
});

describe('paths', () => {
  const pts = [
    { day: 'a', cents: 1, x: 0, y: 0.5, outlier: null },
    { day: 'b', cents: 1, x: 0.5, y: 0.25, outlier: null },
  ];

  it('draws straight segments in pixels', () => {
    expect(linePath(pts, 200, 100)).toBe('M0 50L100 25');
  });

  it('closes the area at the baseline', () => {
    expect(areaPath(pts, 200, 100, 0.9)).toBe('M0 50L100 25L100 90L0 90Z');
    expect(areaPath([], 200, 100, 0.9)).toBe('');
  });
});

describe('usual range (C-111)', () => {
  const run = (n: number, price: (i: number) => number) => days('2026-10-01', n, price);

  it('quantile interpolates between neighbours', () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(quantile([10, 20, 30, 40], 0.25)).toBe(17.5);
    expect(quantile([5], 0.75)).toBe(5);
    expect(quantile([], 0.5)).toBeUndefined();
  });

  it('spans the middle half of the regular prices, top above bottom', () => {
    const series = run(20, (i) => 100_000 + i * 1_000);
    const g = chartGeometry(series, { from: '2026-10-01', to: '2026-10-20' });
    expect(g.usual).not.toBeNull();
    expect(g.usual?.lowCents).toBe(104_750);
    expect(g.usual?.highCents).toBe(114_250);
    expect(g.usual?.yTop ?? 1).toBeLessThan(g.usual?.yBottom ?? 0);
  });

  it('is left out for sparse and flat series', () => {
    const sparse = chartGeometry(
      run(4, (i) => 100_000 + i * 5_000),
      {
        from: '2026-10-01',
        to: '2026-10-04',
      },
    );
    expect(sparse.usual).toBeNull();
    const flat = chartGeometry(
      run(14, () => 100_000),
      { from: '2026-10-01', to: '2026-10-14' },
    );
    expect(flat.usual).toBeNull();
  });

  it('ignores outliers', () => {
    const series = run(14, (i) => (i === 5 ? 900_000 : 100_000 + (i % 3) * 2_000));
    const g = chartGeometry(series, { from: '2026-10-01', to: '2026-10-14' });
    expect(g.usual?.highCents).toBeLessThanOrEqual(104_000);
  });
});
