import { dayDiff } from './calendar';

/** Night grid (D-42, PLAN §7.0): prices of every single night, collected daily. */
export const NIGHT_GRID = {
  /** Nights ahead per hotel; the collector's NIGHT_WINDOW_DAYS default. */
  windowDays: 120,
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
