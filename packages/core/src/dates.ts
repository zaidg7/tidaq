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
