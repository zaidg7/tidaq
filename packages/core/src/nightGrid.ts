import { dayDiff } from './calendar';

/** Night grid (D-42, PLAN §7.0): prices of every single night, collected daily. */
export const NIGHT_GRID = {
  /** Nights ahead per hotel; the collector's NIGHT_WINDOW_DAYS default. */
  windowDays: 270,
  /** The only occupancy the grid collects (the most common luxury booking). */
  adults: 2,
  /** A real stay price this far from the night sum gets a note on the stay page. */
  noteGap: 0.03,
} as const;

/**
 * Whether a stay's history can come from the night grid: 2 adults, check-in today or later and
 * every night inside the window (check-out at most `windowDays` after today).
 */
export function inNightGrid(
  stay: { checkIn: string; checkOut: string; adults: number },
  today: string,
): boolean {
  return (
    stay.adults === NIGHT_GRID.adults &&
    stay.checkIn >= today &&
    dayDiff(today, stay.checkOut) <= NIGHT_GRID.windowDays
  );
}

/**
 * The real stay price and the sum of its nights differ by more than `noteGap` (relative to the
 * sum). Null when one of them is missing.
 */
export function nightSumGap(realCents: number | null, sumCents: number | null): number | null {
  if (realCents === null || sumCents === null || sumCents <= 0) return null;
  const gap = (realCents - sumCents) / sumCents;
  return Math.abs(gap) > NIGHT_GRID.noteGap ? gap : null;
}

/** Daily night-sum accuracy check (C-070c): summed nights vs the real price of the same stay. */
export const NIGHT_ACCURACY = {
  /** The gap that counts as a match: the same 3 % as the stay page note. */
  matchGap: NIGHT_GRID.noteGap,
  /** Below this share of matching pairs the method needs a look. */
  minShare: 0.75,
  /** ...on this many days in a row, */
  alarmDays: 3,
  /** ...each with at least this many pairs (fewer says little). */
  minPairs: 20,
} as const;

/** One day of `night_accuracy`: (stay, platform) pairs compared and those within 3 %. */
export interface NightAccuracyDay {
  day: string;
  pairs: number;
  within3: number;
}

/** Share of pairs within 3 %, or null without pairs. */
export function accuracyShare(d: NightAccuracyDay): number | null {
  return d.pairs > 0 ? d.within3 / d.pairs : null;
}

/**
 * The night sums missed on `alarmDays` consecutive days up to the newest row (each with enough
 * pairs and a share below `minShare`): those days' shares, newest first. Null otherwise.
 */
export function nightAccuracyAlarm(days: readonly NightAccuracyDay[]): number[] | null {
  const sorted = [...days].sort((a, b) => (a.day < b.day ? 1 : -1));
  const recent = sorted.slice(0, NIGHT_ACCURACY.alarmDays);
  if (recent.length < NIGHT_ACCURACY.alarmDays) return null;
  const shares: number[] = [];
  for (const [i, d] of recent.entries()) {
    const prev = recent[i - 1];
    if (prev && dayDiff(d.day, prev.day) !== 1) return null;
    const share = accuracyShare(d);
    if (d.pairs < NIGHT_ACCURACY.minPairs || share === null || share >= NIGHT_ACCURACY.minShare) {
      return null;
    }
    shares.push(share);
  }
  return shares;
}
