import { addDays, daysBetween } from './dates';
import type { DailyPrice } from './stats';

/**
 * Price chart geometry (CRAFT.md §3 Price chart), independent of pixels: x and y are fractions of
 * the drawing box (0–1, y = 0 at the top), so the server-rendered SVG and the client scrub layer
 * share one source of truth at any width.
 */

export interface ChartPoint {
  day: string;
  cents: number;
  x: number;
  y: number;
}

export interface ChartGeometry {
  /** Points inside the window, oldest first. */
  points: ChartPoint[];
  /** Runs of consecutive days: a missing day breaks the line. */
  segments: ChartPoint[][];
  /** Visible price range in cents (guarded, see `CHART.domain…`). */
  domain: { min: number; max: number };
  /** 2–4 horizontal grid lines at round euro values. */
  yTicks: { cents: number; y: number }[];
  /** 4 evenly spaced dates. */
  xTicks: { day: string; x: number }[];
  /** Lowest point (earliest on ties), latest point, average line. */
  low: ChartPoint | null;
  last: ChartPoint | null;
  avg: { cents: number; y: number } | null;
  /** Fewer than `CHART.minLinePoints`: draw dots only, no line. */
  sparse: boolean;
  /** Baseline of the area fill (the bottom of the plot). */
  baseY: number;
}

export const CHART = {
  /** Plot insets as fractions of the box. Bottom leaves room for the date labels. */
  inset: { left: 0.015, right: 0.035, top: 0.08, bottom: 0.14 },
  /** Domain = [min − 0.5·range, max + 0.15·range] … */
  domainBelow: 0.5,
  domainAbove: 0.15,
  /** … and at least ±6 % around the average, so a 9 € wiggle doesn't look like a cliff. */
  domainMinSwing: 0.06,
  minLinePoints: 7,
  xTickCount: 4,
} as const;

/** A round step (1, 2, 2.5, 5 × 10ⁿ euros) for about three grid intervals. */
export function niceStep(spanCents: number): number {
  const raw = Math.max(spanCents / 3, 100);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  // Steps below 1 € make no sense for hotel totals; 2.5 € steps are fine.
  return Math.max(100, Math.round(step));
}

interface ChartWindow {
  /** First and last day of the x axis (`YYYY-MM-DD`, inclusive). */
  from: string;
  to: string;
  /** Average for the dashed line, e.g. `avg30Cents`; omitted → no line. */
  avgCents?: number | null;
}

export function chartGeometry(series: readonly DailyPrice[], window: ChartWindow): ChartGeometry {
  const { inset } = CHART;
  const totalDays = Math.max(1, daysBetween(window.from, window.to));
  const inWindow = series
    .filter((p) => p.day >= window.from && p.day <= window.to && Number.isFinite(p.bestCents))
    .slice()
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  const xOf = (day: string) =>
    inset.left + (daysBetween(window.from, day) / totalDays) * (1 - inset.left - inset.right);
  const baseY = 1 - inset.bottom;

  const xTicks = Array.from({ length: CHART.xTickCount }, (_, i) => {
    const offset = Math.round((i * totalDays) / (CHART.xTickCount - 1));
    const day = addDays(window.from, offset);
    return { day, x: xOf(day) };
  });

  if (inWindow.length === 0) {
    return {
      points: [],
      segments: [],
      domain: { min: 0, max: 0 },
      yTicks: [],
      xTicks,
      low: null,
      last: null,
      avg: null,
      sparse: true,
      baseY,
    };
  }

  const values = inWindow.map((p) => p.bestCents);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const center = window.avgCents ?? mean;
  let lo = minV - CHART.domainBelow * range;
  let hi = maxV + CHART.domainAbove * range;
  lo = Math.max(0, Math.min(lo, center * (1 - CHART.domainMinSwing)));
  hi = Math.max(hi, center * (1 + CHART.domainMinSwing));

  const yOf = (cents: number) => inset.top + ((hi - cents) / (hi - lo)) * (baseY - inset.top);

  const points: ChartPoint[] = inWindow.map((p) => ({
    day: p.day,
    cents: p.bestCents,
    x: xOf(p.day),
    y: yOf(p.bestCents),
  }));

  const segments: ChartPoint[][] = [];
  for (const point of points) {
    const run = segments.at(-1);
    const prev = run?.at(-1);
    if (run && prev && daysBetween(prev.day, point.day) === 1) run.push(point);
    else segments.push([point]);
  }

  const step = niceStep(hi - lo);
  const yTicks: { cents: number; y: number }[] = [];
  for (let c = Math.ceil(lo / step) * step; c <= hi; c += step)
    yTicks.push({ cents: c, y: yOf(c) });

  const low = points.reduce(
    (best, p) => (p.cents < best.cents ? p : best),
    points[0] as ChartPoint,
  );
  const avgCents = window.avgCents ?? null;

  return {
    points,
    segments,
    domain: { min: Math.round(lo), max: Math.round(hi) },
    yTicks,
    xTicks,
    low,
    last: points.at(-1) ?? null,
    avg: avgCents === null ? null : { cents: avgCents, y: yOf(avgCents) },
    sparse: points.length < CHART.minLinePoints,
    baseY,
  };
}

const n = (v: number) => Math.round(v * 100) / 100;

/** SVG path of straight segments through `points` in a `width` × `height` box. */
export function linePath(points: readonly ChartPoint[], width: number, height: number): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x * width)} ${n(p.y * height)}`)
    .join('');
}

/** Closed area under `points` down to `baseY` (a fraction of the height). */
export function areaPath(
  points: readonly ChartPoint[],
  width: number,
  height: number,
  baseY: number,
): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return '';
  const base = n(baseY * height);
  return `${linePath(points, width, height)}L${n(last.x * width)} ${base}L${n(first.x * width)} ${base}Z`;
}
