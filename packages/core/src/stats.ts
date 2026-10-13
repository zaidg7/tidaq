import { daysBetween } from './dates';
import type { StayState } from './db';

/** One point of a stay's price history: the best total price seen on that day. */
export interface DailyPrice {
  day: string;
  bestCents: number;
}

export type Trend = 'falling' | 'flat' | 'rising';

export type AdviceKey =
  'collecting' | 'near_low' | 'good_falling' | 'good' | 'normal_falling' | 'normal' | 'high';

export interface StayStatsResult {
  /** Days with data inside the window. */
  daysTracked: number;
  /** Latest best price in the window, or null without data. */
  nowCents: number | null;
  /** Day of `nowCents`. */
  nowDay: string | null;
  lowCents: number | null;
  highCents: number | null;
  /** Mean of the last 30 days, rounded to whole cents. */
  avg30Cents: number | null;
  /** 0 = lowest price seen in the window, 1 = highest (mid-rank for ties). Null below 2 points. */
  percentile: number | null;
  /** Least-squares slope over the last 7 days in % per week. Null below 2 points. */
  trend7d: number | null;
  trend: Trend | null;
  state: StayState;
  advice: AdviceKey;
  /** Check-in is 0–7 days away: show the "don't wait too long" note. */
  soon: boolean;
  /** The latest data point is older than 2 days (collector problem). */
  stale: boolean;
}

/** PLAN §8.1 thresholds. */
export const STATS = {
  windowDays: 60,
  minDays: 7,
  nearLowFactor: 1.02,
  nearLowPercentile: 0.1,
  goodPercentile: 0.35,
  highPercentile: 0.75,
  trendDays: 7,
  trendThresholdPct: 1.5,
  soonDays: 7,
  staleDays: 2,
} as const;

/** Mid-rank position of `value` among `values` (which contain it), 0..1. */
function percentileOf(value: number, values: readonly number[]): number | null {
  if (values.length < 2) return null;
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return (below + (equal - 1) / 2) / (values.length - 1);
}

/** Least-squares slope of the points as % of their mean per week. */
function trendPctPerWeek(points: readonly { x: number; y: number }[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0 || meanY === 0) return null;
  return ((num / den) * 7 * 100) / meanY;
}

function classify(percentile: number | null, now: number, low: number): StayState {
  if (now <= low * STATS.nearLowFactor || (percentile ?? 1) <= STATS.nearLowPercentile) {
    return 'near_low';
  }
  if (percentile === null) return 'normal';
  if (percentile <= STATS.goodPercentile) return 'good';
  if (percentile >= STATS.highPercentile) return 'high';
  return 'normal';
}

function adviceFor(state: StayState, trend: Trend | null): AdviceKey {
  switch (state) {
    case 'collecting':
    case 'near_low':
    case 'high':
      return state;
    case 'good':
      return trend === 'falling' ? 'good_falling' : 'good';
    case 'normal':
      return trend === 'falling' ? 'normal_falling' : 'normal';
  }
}

/**
 * Price signal for one stay (PLAN §8.1). Pure: pass `today` and the stay's check-in.
 * `series` may be unsorted, contain gaps, and contain days outside the window; duplicate days
 * keep the lowest price. Prices must be positive integer cents.
 */
export function computeStayStats(
  series: readonly DailyPrice[],
  today: string,
  checkIn: string,
): StayStatsResult {
  const byDay = new Map<string, number>();
  for (const { day, bestCents } of series) {
    if (!Number.isInteger(bestCents) || bestCents <= 0) {
      throw new RangeError(`Invalid price ${bestCents} on ${day}`);
    }
    const age = daysBetween(day, today);
    if (age < 0 || age >= STATS.windowDays) continue;
    const prev = byDay.get(day);
    if (prev === undefined || bestCents < prev) byDay.set(day, bestCents);
  }
  const points = [...byDay.entries()]
    .map(([day, cents]) => ({ day, cents, age: daysBetween(day, today) }))
    .sort((a, b) => b.age - a.age);

  const daysToCheckIn = daysBetween(today, checkIn);
  const soon = daysToCheckIn >= 0 && daysToCheckIn <= STATS.soonDays;
  const latest = points.at(-1);

  if (!latest) {
    return {
      daysTracked: 0,
      nowCents: null,
      nowDay: null,
      lowCents: null,
      highCents: null,
      avg30Cents: null,
      percentile: null,
      trend7d: null,
      trend: null,
      state: 'collecting',
      advice: 'collecting',
      soon,
      stale: false,
    };
  }

  const values = points.map((p) => p.cents);
  const now = latest.cents;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const last30 = points.filter((p) => p.age < 30);
  const avg30 = Math.round(last30.reduce((s, p) => s + p.cents, 0) / last30.length);
  const percentile = percentileOf(now, values);

  const trend7d = trendPctPerWeek(
    points.filter((p) => p.age < STATS.trendDays).map((p) => ({ x: -p.age, y: p.cents })),
  );
  const trend: Trend | null =
    trend7d === null
      ? null
      : trend7d < -STATS.trendThresholdPct
        ? 'falling'
        : trend7d > STATS.trendThresholdPct
          ? 'rising'
          : 'flat';

  const state: StayState =
    points.length < STATS.minDays ? 'collecting' : classify(percentile, now, low);

  return {
    daysTracked: points.length,
    nowCents: now,
    nowDay: latest.day,
    lowCents: low,
    highCents: high,
    avg30Cents: avg30,
    percentile,
    trend7d,
    trend,
    state,
    advice: adviceFor(state, trend),
    soon,
    stale: latest.age > STATS.staleDays,
  };
}

/** `(value − base) / base`, e.g. −0.05 for "5 % below the 30-day average". Null without a base. */
export function relativeChange(value: number, base: number | null): number | null {
  if (base === null || !Number.isFinite(base) || base <= 0 || !Number.isFinite(value)) return null;
  return (value - base) / base;
}
