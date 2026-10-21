import { addDays, daysBetween } from './dates';
import type { DailyPrice } from './stats';

/**
 * Price chart geometry (CRAFT.md §3 Price chart), independent of pixels: x and y are fractions of
 * the plot box (0–1, y = 0 at the top), so the server-rendered SVG and the client scrub layer
 * share one source of truth at any width. The web layer adds pixel gutters for the labels.
 */

export interface ChartPoint {
  day: string;
  cents: number;
  x: number;
  y: number;
  /** Far outside the usual range: kept out of the domain, pinned to the top or bottom edge. */
  outlier: 'high' | 'low' | null;
}

/** One slot per calendar day, with or without a price (keyboard steps by day). */
export interface ChartDay {
  day: string;
  x: number;
  point: ChartPoint | null;
}

export interface ChartBand {
  x0: number;
  x1: number;
  /** No data since `since` (the days before tracking started are cut, never boxed: C-174). */
  kind: 'stale';
  since: string;
}

export interface ChartGeometry {
  /** The window actually drawn: it starts at the first price, never with empty days (C-174). */
  from: string;
  to: string;
  days: ChartDay[];
  /** Days with a price, oldest first. */
  points: ChartPoint[];
  /** Runs of consecutive days without outliers: a missing day or an outlier breaks the line. */
  segments: ChartPoint[][];
  /** Visible price range in cents (guarded, outliers excluded). */
  domain: { min: number; max: number };
  /** 3–4 horizontal grid lines at round euro values (fewer only for flat or empty data). */
  yTicks: { cents: number; y: number }[];
  xTicks: { day: string; x: number }[];
  /** Lowest regular point (earliest on ties); null for flat data. */
  low: ChartPoint | null;
  last: ChartPoint | null;
  /** The last point is today or yesterday (the morning run may still be pending). */
  lastIsCurrent: boolean;
  /** Dashed average line; null when absent, for sparse data, or when it would sit on a flat line. */
  avg: { cents: number; y: number } | null;
  /**
   * The usual range (PREMIUM.md §8): the middle half of the regular prices (25th to 75th
   * percentile), drawn as a soft band labelled "üblich". Null for sparse or flat data and when the
   * band would be thinner than a line.
   */
  usual: { lowCents: number; highCents: number; yTop: number; yBottom: number } | null;
  /** Fewer than `CHART.minLinePoints`: a dot on every price, no average or usual band. */
  sparse: boolean;
  /** All prices within 0.5 %: no low marker. */
  flat: boolean;
  band: ChartBand | null;
  /** Baseline of the area fill (the bottom of the plot). */
  baseY: number;
}

export const CHART = {
  /** Plot insets as fractions. Left and right are tiny: the web layer reserves label gutters. */
  inset: { left: 0.012, right: 0.012, top: 0.08, bottom: 0.14 },
  /** Domain = [min − 0.5·range, max + 0.15·range] … */
  domainBelow: 0.5,
  domainAbove: 0.15,
  /** … and at least ±6 % around the average, so a 9 € wiggle doesn't look like a cliff. */
  domainMinSwing: 0.06,
  /** Points above 1.6× or below 0.5× the median are outliers (e.g. a broken provider price). */
  outlierHigh: 1.6,
  outlierLow: 0.5,
  /** Below this share of the mean the series counts as flat. */
  flatShare: 0.005,
  minLinePoints: 7,
  /** The x axis spans at least this many days, so one or two prices don't sit on the edges. */
  minWindowDays: 3,
  /** No data for this many days before `to`: show the "no data since" band. */
  staleDays: 2,
  xTickCount: 4,
  /** The usual-range band is left out when thinner than this share of the plot height. */
  usualMinHeight: 0.02,
} as const;

const STEP_FACTORS = [5, 2.5, 2, 1];

/**
 * Grid lines at round euro values: walks the 5 / 2.5 / 2 / 1 × 10ⁿ ladder from coarse to fine
 * and takes the first step that yields 3 or 4 lines inside the domain (steps ≥ 1 €).
 */
export function gridTicks(lo: number, hi: number): number[] {
  if (!(hi > lo)) return [];
  const ticksFor = (step: number) => {
    const out: number[] = [];
    for (let c = Math.ceil(lo / step) * step; c <= hi + 1e-6; c += step) out.push(Math.round(c));
    return out;
  };
  const top = Math.floor(Math.log10(hi - lo));
  let fallback: number[] = [];
  for (let e = top; e >= 2; e--) {
    for (const f of STEP_FACTORS) {
      const step = f * 10 ** e;
      if (step < 100) continue;
      const ticks = ticksFor(step);
      if (ticks.length >= 3 && ticks.length <= 4) return ticks;
      if (ticks.length >= 2 && fallback.length < 2) fallback = ticks;
    }
  }
  return fallback;
}

interface ChartWindow {
  /** First and last day of the x axis (`YYYY-MM-DD`, inclusive). `to` is normally today. */
  from: string;
  to: string;
  /** Average for the dashed line, e.g. `avg30Cents`; omitted → no line. */
  avgCents?: number | null;
}

/** Linear-interpolated quantile (0..1) of `values`; undefined for an empty list. */
export function quantile(values: readonly number[], q: number): number | undefined {
  if (values.length === 0) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q));
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const a = s[lower] as number;
  const b = s[upper] as number;
  return a + (b - a) * (pos - lower);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

export function chartGeometry(series: readonly DailyPrice[], window: ChartWindow): ChartGeometry {
  const { inset } = CHART;
  const byDay = new Map<string, number>();
  for (const p of series) {
    if (p.day >= window.from && p.day <= window.to && Number.isFinite(p.bestCents)) {
      byDay.set(p.day, p.bestCents);
    }
  }
  const sortedDays = [...byDay.keys()].sort();
  const sparse = sortedDays.length < CHART.minLinePoints;

  // The axis starts at the first price (C-174): days before tracking started are left out,
  // not drawn as an empty box. At least `minWindowDays`, so a lone price isn't on the edge.
  let from = window.from;
  const first = sortedDays[0];
  if (first && first > from) {
    const shortest = addDays(window.to, -(CHART.minWindowDays - 1));
    from = [window.from, first < shortest ? first : shortest].sort()[1] as string;
  }
  const to = window.to;
  const totalDays = Math.max(1, daysBetween(from, to));
  const xOf = (day: string) =>
    inset.left + (daysBetween(from, day) / totalDays) * (1 - inset.left - inset.right);
  const baseY = 1 - inset.bottom;

  const xTicks = Array.from({ length: CHART.xTickCount }, (_, i) => {
    const day = addDays(from, Math.round((i * totalDays) / (CHART.xTickCount - 1)));
    return { day, x: xOf(day) };
  });

  const values = sortedDays.map((d) => byDay.get(d) as number);
  const med = values.length >= 3 ? median(values) : null;
  const outlierOf = (v: number): ChartPoint['outlier'] =>
    med === null
      ? null
      : v > med * CHART.outlierHigh
        ? 'high'
        : v < med * CHART.outlierLow
          ? 'low'
          : null;
  const regular = values.filter((v) => outlierOf(v) === null);

  let lo = 0;
  let hi = 0;
  let flat = false;
  if (regular.length > 0) {
    const minV = Math.min(...regular);
    const maxV = Math.max(...regular);
    const range = maxV - minV;
    const mean = regular.reduce((s, v) => s + v, 0) / regular.length;
    flat = range < mean * CHART.flatShare;
    const center = window.avgCents ?? mean;
    lo = Math.max(
      0,
      Math.min(minV - CHART.domainBelow * range, center * (1 - CHART.domainMinSwing)),
    );
    hi = Math.max(maxV + CHART.domainAbove * range, center * (1 + CHART.domainMinSwing));
  }
  const yOf = (cents: number) => inset.top + ((hi - cents) / (hi - lo)) * (baseY - inset.top);

  const points: ChartPoint[] = sortedDays.map((day) => {
    const cents = byDay.get(day) as number;
    const outlier = outlierOf(cents);
    const y = outlier === 'high' ? inset.top : outlier === 'low' ? baseY : yOf(cents);
    return { day, cents, x: xOf(day), y, outlier };
  });

  const segments: ChartPoint[][] = [];
  let prev: ChartPoint | null = null;
  for (const point of points) {
    if (point.outlier) {
      prev = null;
      continue;
    }
    const run = segments.at(-1);
    if (run && prev && daysBetween(prev.day, point.day) === 1) run.push(point);
    else segments.push([point]);
    prev = point;
  }

  const pointByDay = new Map(points.map((p) => [p.day, p]));
  const days: ChartDay[] = Array.from({ length: totalDays + 1 }, (_, i) => {
    const day = addDays(from, i);
    return { day, x: xOf(day), point: pointByDay.get(day) ?? null };
  });

  const regularPoints = points.filter((p) => !p.outlier);
  const low =
    flat || regularPoints.length === 0
      ? null
      : regularPoints.reduce(
          (best, p) => (p.cents < best.cents ? p : best),
          regularPoints[0] as ChartPoint,
        );
  const last = points.at(-1) ?? null;
  const lastIsCurrent = last !== null && daysBetween(last.day, to) <= 1;

  const avgCents = window.avgCents ?? null;
  const flatValue = flat ? (regular[0] as number) : null;
  const avgOnLine =
    flatValue !== null &&
    avgCents !== null &&
    Math.abs(avgCents - flatValue) < flatValue * CHART.flatShare;
  const avg =
    avgCents === null || sparse || regular.length === 0 || avgOnLine
      ? null
      : { cents: avgCents, y: yOf(avgCents) };

  let usual: ChartGeometry['usual'] = null;
  if (!sparse && !flat && regular.length >= CHART.minLinePoints) {
    const q1 = Math.round(quantile(regular, 0.25) as number);
    const q3 = Math.round(quantile(regular, 0.75) as number);
    const yTop = yOf(q3);
    const yBottom = yOf(q1);
    if (yBottom - yTop >= CHART.usualMinHeight) {
      usual = { lowCents: q1, highCents: q3, yTop, yBottom };
    }
  }

  const yTicks = gridTicks(lo, hi)
    // A grid line exactly under a flat price line would hide it.
    .filter((c) => flatValue === null || Math.abs(c - flatValue) >= flatValue * CHART.flatShare)
    .map((cents) => ({ cents, y: yOf(cents) }));

  let band: ChartBand | null = null;
  const halfDay = (1 - inset.left - inset.right) / totalDays / 2;
  if (last && daysBetween(last.day, to) >= CHART.staleDays) {
    band = { x0: xOf(last.day) + halfDay, x1: xOf(to), kind: 'stale', since: last.day };
  }

  return {
    from,
    to,
    days,
    points,
    segments,
    domain: { min: Math.round(lo), max: Math.round(hi) },
    yTicks,
    xTicks,
    low,
    last,
    lastIsCurrent,
    avg,
    usual,
    sparse,
    flat,
    band,
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
