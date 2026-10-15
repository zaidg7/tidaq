import { addDays, daysBetween } from './dates';
import { STATS, type DailyPrice } from './stats';

/**
 * Facts behind the verdict sentence (CRAFT.md §5): always about the past, never a forecast.
 * "Günstiger als an {pricierDays} der letzten {n} Tage."
 */
export interface VerdictFacts {
  /** Days with a price in the stats window (same as `daysTracked`). */
  n: number;
  /** Earlier days on which the price was higher than now. */
  pricierDays: number;
  /** Earlier days on which the price was lower than now. */
  cheaperDays: number;
  /** First day with data in the window. */
  firstDay: string | null;
  /** While collecting: the day the first verdict is due (one price per day). */
  verdictOn: string | null;
}

export function verdictFacts(
  series: readonly DailyPrice[],
  today: string,
  nowCents: number | null,
): VerdictFacts {
  const inWindow = series.filter((p) => {
    const age = daysBetween(p.day, today);
    return age >= 0 && age < STATS.windowDays;
  });
  const days = [...new Set(inWindow.map((p) => p.day))].sort();
  const latest = days.at(-1) ?? null;
  const earlier = inWindow.filter((p) => p.day !== latest);
  const n = days.length;
  return {
    n,
    pricierDays: nowCents === null ? 0 : earlier.filter((p) => p.bestCents > nowCents).length,
    cheaperDays: nowCents === null ? 0 : earlier.filter((p) => p.bestCents < nowCents).length,
    firstDay: days[0] ?? null,
    verdictOn: n >= STATS.minDays ? null : addDays(today, STATS.minDays - Math.max(n, 1)),
  };
}

export type MeterZone = 'cheap' | 'normal' | 'dear';

const ZONES: readonly MeterZone[] = ['cheap', 'normal', 'dear'];
/** Keeps the knob this far (share of the bar) inside its zone, never on a zone edge. */
const KNOB_INSET = 0.04;

/**
 * The verdict meter (PREMIUM.md §8, mockup B): Günstig · Normal · Teuer as three equal zones and
 * a knob for today's price. `position` is today's rank among the window's prices (0 = lowest
 * seen, 1 = highest); the zones split where the verdict states split (`STATS.goodPercentile`,
 * `highPercentile`). `knob` maps that rank onto the equal thirds, piece by piece, so the knob
 * always sits inside the zone the verdict names. Null without a percentile.
 */
export function meter(percentile: number | null): {
  position: number;
  zone: MeterZone;
  bounds: readonly [number, number];
  knob: number;
} | null {
  if (percentile === null || Number.isNaN(percentile)) return null;
  const position = Math.max(0, Math.min(1, percentile));
  const bounds = [STATS.goodPercentile, STATS.highPercentile] as const;
  const zone: MeterZone =
    position <= bounds[0] ? 'cheap' : position >= bounds[1] ? 'dear' : 'normal';
  const i = ZONES.indexOf(zone);
  const [from, to] =
    zone === 'cheap' ? [0, bounds[0]] : zone === 'normal' ? [bounds[0], bounds[1]] : [bounds[1], 1];
  const within = to > from ? (position - from) / (to - from) : 0.5;
  const knob = Math.min((i + 1) / 3 - KNOB_INSET, Math.max(i / 3 + KNOB_INSET, (i + within) / 3));
  return { position, zone, bounds, knob };
}
