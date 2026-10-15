import { daysBetween } from './dates';
import type { DailyPrice } from './stats';

/** One point of the story chart: its day and price, placed on a 0..1 square (y = 0 is top). */
export interface StoryPoint {
  day: string;
  cents: number;
  x: number;
  y: number;
}

/** Room above the highest and below the lowest price, as a share of the height. */
const PAD_TOP = 0.18;
const PAD_BOTTOM = 0.22;

/**
 * The drop page's story chart (mockup B "So hat sich der Preis bewegt"): the night's prices from
 * the first check to today, placed left to right by day and top to bottom by price. The page draws
 * every step in ink and the last one, the drop, in green. Null with fewer than two prices.
 */
export function storyChart(
  series: readonly DailyPrice[],
  today: string,
): { points: StoryPoint[]; from: string; to: string } | null {
  const points = series
    .filter((p) => p.day <= today && p.bestCents > 0)
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day));
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;
  const span = Math.max(1, daysBetween(first.day, last.day));
  const prices = points.map((p) => p.bestCents);
  const hi = Math.max(...prices);
  const lo = Math.min(...prices);
  const range = hi - lo;
  return {
    from: first.day,
    to: last.day,
    points: points.map((p) => ({
      day: p.day,
      cents: p.bestCents,
      x: daysBetween(first.day, p.day) / span,
      y: range === 0 ? 0.5 : PAD_TOP + ((hi - p.bestCents) / range) * (1 - PAD_TOP - PAD_BOTTOM),
    })),
  };
}
