import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { areaPath, CHART, chartGeometry, linePath, niceStep } from './chart';
import type { DailyPrice } from './stats';

const FROM = '2026-09-01';
const TO = '2026-10-30';

/** `n` consecutive days from `start` with prices from `f(i)`. */
function days(start: string, n: number, f: (i: number) => number): DailyPrice[] {
  return Array.from({ length: n }, (_, i) => ({ day: addDays(start, i), bestCents: f(i) }));
}

describe('niceStep', () => {
  it('picks round euro steps for about three intervals', () => {
    expect(niceStep(30_000)).toBe(10_000); // 300 € span → 100 € steps
    expect(niceStep(15_000)).toBe(5_000);
    expect(niceStep(6_000)).toBe(2_000);
    expect(niceStep(7_000)).toBe(2_500);
    expect(niceStep(100)).toBe(100); // never below 1 €
  });
});

describe('chartGeometry', () => {
  it('maps the window to the plot area and keeps the order', () => {
    const series = days(FROM, 60, (i) => 120_000 - i * 100).reverse();
    const g = chartGeometry(series, { from: FROM, to: TO });
    expect(g.points).toHaveLength(60);
    expect(g.points[0]?.day).toBe(FROM);
    expect(g.points[0]?.x).toBeCloseTo(CHART.inset.left);
    expect(g.points.at(-1)?.x).toBeCloseTo(1 - CHART.inset.right);
    expect(g.last?.day).toBe('2026-10-30');
    expect(g.sparse).toBe(false);
    for (const p of g.points) {
      expect(p.y).toBeGreaterThanOrEqual(CHART.inset.top);
      expect(p.y).toBeLessThanOrEqual(g.baseY);
    }
  });

  it('puts the highest price near the top and leaves room below the low', () => {
    const g = chartGeometry(
      days(FROM, 30, (i) => 100_000 + (i % 2) * 20_000),
      { from: FROM, to: TO },
    );
    // range 200 €: domain [1000 − 100, 1200 + 30] = [900, 1230] €
    expect(g.domain).toEqual({ min: 90_000, max: 123_000 });
    const top = Math.min(...g.points.map((p) => p.y));
    const bottom = Math.max(...g.points.map((p) => p.y));
    expect(top).toBeGreaterThan(CHART.inset.top);
    expect(bottom).toBeLessThan(g.baseY - 0.1);
  });

  it('keeps a small wiggle flat (at least ±6 % of the average)', () => {
    const g = chartGeometry(
      days(FROM, 20, (i) => 100_000 + (i % 2) * 900),
      {
        from: FROM,
        to: TO,
        avgCents: 100_450,
      },
    );
    expect(g.domain.min).toBeLessThanOrEqual(Math.round(100_450 * 0.94));
    expect(g.domain.max).toBeGreaterThanOrEqual(Math.round(100_450 * 1.06));
    const ys = g.points.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.1);
    expect(g.avg?.cents).toBe(100_450);
  });

  it('handles a single flat price without dividing by zero', () => {
    const g = chartGeometry([{ day: '2026-10-30', bestCents: 50_000 }], { from: FROM, to: TO });
    expect(g.points).toHaveLength(1);
    expect(Number.isFinite(g.points[0]?.y)).toBe(true);
    expect(g.sparse).toBe(true);
    expect(g.low).toEqual(g.last);
    expect(g.yTicks.length).toBeGreaterThanOrEqual(2);
  });

  it('breaks the line at missing days', () => {
    const series = [...days(FROM, 5, () => 90_000), ...days('2026-09-08', 4, () => 95_000)];
    const g = chartGeometry(series, { from: FROM, to: TO });
    expect(g.segments.map((s) => s.length)).toEqual([5, 4]);
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

  it('ignores points outside the window', () => {
    const g = chartGeometry(
      [
        { day: '2026-08-31', bestCents: 1 },
        { day: '2026-09-02', bestCents: 90_000 },
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
    expect(g.avg).toBeNull();
    expect(g.xTicks.map((t) => t.day)).toEqual([
      '2026-09-01',
      '2026-09-21',
      '2026-10-10',
      '2026-10-30',
    ]);
  });

  it('places grid lines on round euro values inside the domain', () => {
    const g = chartGeometry(
      days(FROM, 30, (i) => 110_000 + i * 1_000),
      { from: FROM, to: TO },
    );
    expect(g.yTicks.length).toBeGreaterThanOrEqual(2);
    expect(g.yTicks.length).toBeLessThanOrEqual(4);
    for (const t of g.yTicks) {
      expect(t.cents % 100).toBe(0);
      expect(t.cents).toBeGreaterThanOrEqual(g.domain.min);
      expect(t.cents).toBeLessThanOrEqual(g.domain.max);
    }
  });
});

describe('paths', () => {
  const pts = [
    { day: 'a', cents: 1, x: 0, y: 0.5 },
    { day: 'b', cents: 1, x: 0.5, y: 0.25 },
  ];

  it('draws straight segments in pixels', () => {
    expect(linePath(pts, 200, 100)).toBe('M0 50L100 25');
  });

  it('closes the area at the baseline', () => {
    expect(areaPath(pts, 200, 100, 0.9)).toBe('M0 50L100 25L100 90L0 90Z');
    expect(areaPath([], 200, 100, 0.9)).toBe('');
  });
});
