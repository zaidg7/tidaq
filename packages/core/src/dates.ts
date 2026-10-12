import { isoDateSchema } from './zod';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses a `YYYY-MM-DD` stay date to a UTC midnight timestamp. Throws on invalid input. */
export function parseIsoDate(value: string): number {
  return Date.parse(`${isoDateSchema.parse(value)}T00:00:00Z`);
}

/** Number of hotel nights between check-in and check-out. Throws if check-out is not after check-in. */
export function nights(checkIn: string, checkOut: string): number {
  const diff = (parseIsoDate(checkOut) - parseIsoDate(checkIn)) / MS_PER_DAY;
  if (diff < 1) {
    throw new RangeError(`Check-out (${checkOut}) must be after check-in (${checkIn})`);
  }
  return diff;
}

/** Formats a UTC timestamp as `YYYY-MM-DD`. */
export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Adds (or subtracts) whole days to a `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
  return toIsoDate(parseIsoDate(date) + days * MS_PER_DAY);
}

/** Day of the week of a `YYYY-MM-DD` date: 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(parseIsoDate(date)).getUTCDay();
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to) - parseIsoDate(from)) / MS_PER_DAY);
}
