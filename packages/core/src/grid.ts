import { addDays, daysBetween, parseIsoDate, weekday } from './dates';
import type { SpecialStay } from './specialDates';
import { z } from './zod';

/** Grid size (PLAN §7.1, D-13). From `GRID_WEEKENDS` / `GRID_MIDWEEK`. */
export interface GridConfig {
  /** Number of upcoming Fri→Sun stays. */
  weekends: number;
  /** Number of Tue→Thu stays within the midweek window. */
  midweek: number;
  /** Midweek stays are picked from check-ins within this many days. Default 42 (6 weeks). */
  midweekWindowDays?: number;
  /** Special stays are tracked once their check-in is within this many days. Default 90. */
  specialHorizonDays?: number;
}

export interface GridHotel {
  id: number;
  citySlug: string;
}

export type GridReason = 'weekend' | 'midweek' | 'special';

export interface GridStay {
  hotelId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  reasons: GridReason[];
}

const ADULTS = 2;
const FRIDAY = 5;
const TUESDAY = 2;
/** A Monday, used to number weeks without ISO-year edge cases. */
const EPOCH_MONDAY = '1970-01-05';

const envInt = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : value),
    z.coerce.number().int().min(0).max(26),
  );

const envSchema = z.object({ GRID_WEEKENDS: envInt(6), GRID_MIDWEEK: envInt(2) });

/** Reads the grid size from Worker vars. Throws on invalid values instead of guessing. */
export function gridConfigFromEnv(env: Record<string, string | undefined>): GridConfig {
  const parsed = envSchema.parse(env);
  return { weekends: parsed.GRID_WEEKENDS, midweek: parsed.GRID_MIDWEEK };
}

/** The first `count` Fridays strictly after `today`, as Fri→Sun stays. */
function weekendStays(today: string, count: number): [string, string][] {
  const offset = (FRIDAY - weekday(today) + 7) % 7 || 7;
  const first = addDays(today, offset);
  return Array.from({ length: count }, (_, n) => {
    const checkIn = addDays(first, 7 * n);
    return [checkIn, addDays(checkIn, 2)];
  });
}

/**
 * Tue→Thu stays inside the window. Picks Tuesdays of every `period`-th week (counted from a fixed
 * epoch), so a stay keeps being chosen every day from the moment it enters the window until
 * check-in. That gives each stay a long, unbroken price history.
 */
function midweekStays(today: string, count: number, windowDays: number): [string, string][] {
  if (count === 0) return [];
  const period = Math.max(1, Math.floor(windowDays / 7 / count));
  const offset = (TUESDAY - weekday(today) + 7) % 7 || 7;
  const stays: [string, string][] = [];
  for (let tuesday = addDays(today, offset); daysBetween(today, tuesday) <= windowDays;) {
    const week = Math.floor(daysBetween(EPOCH_MONDAY, tuesday) / 7);
    if (week % period === 0 && stays.length < count) stays.push([tuesday, addDays(tuesday, 2)]);
    tuesday = addDays(tuesday, 7);
  }
  return stays;
}

/**
 * Builds the stays every active hotel should have tracked on `today` (PLAN §7.1, task C-012).
 * Pure: no clock, no I/O. Never returns past or same-day check-ins. Sorted by hotel, then date.
 */
export function buildGrid(
  today: string,
  hotels: readonly GridHotel[],
  specialStays: readonly SpecialStay[],
  config: GridConfig,
): GridStay[] {
  parseIsoDate(today);
  const midweekWindow = config.midweekWindowDays ?? 42;
  const specialHorizon = config.specialHorizonDays ?? 90;

  const common: [string, string, GridReason][] = [
    ...weekendStays(today, config.weekends).map(
      ([a, b]) => [a, b, 'weekend'] as [string, string, GridReason],
    ),
    ...midweekStays(today, config.midweek, midweekWindow).map(
      ([a, b]) => [a, b, 'midweek'] as [string, string, GridReason],
    ),
  ];
  const upcomingSpecials = specialStays.filter((s) => {
    const daysAhead = daysBetween(today, s.checkIn);
    return daysAhead >= 1 && daysAhead <= specialHorizon && daysBetween(s.checkIn, s.checkOut) >= 1;
  });

  const result: GridStay[] = [];
  for (const hotel of hotels) {
    const byKey = new Map<string, GridStay>();
    const add = (checkIn: string, checkOut: string, reason: GridReason) => {
      const key = `${checkIn}|${checkOut}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
        return;
      }
      byKey.set(key, { hotelId: hotel.id, checkIn, checkOut, adults: ADULTS, reasons: [reason] });
    };
    for (const [checkIn, checkOut, reason] of common) add(checkIn, checkOut, reason);
    for (const special of upcomingSpecials) {
      if (!special.cities || special.cities.includes(hotel.citySlug)) {
        add(special.checkIn, special.checkOut, 'special');
      }
    }
    result.push(...[...byKey.values()].sort((a, b) => a.checkIn.localeCompare(b.checkIn)));
  }
  return result.sort((a, b) => a.hotelId - b.hotelId || a.checkIn.localeCompare(b.checkIn));
}

/**
 * True when a tracked stay's check-in has passed, so it should be set `active=false`.
 * A stay checking in today stays active for one last price (DataForSEO accepts today).
 */
export function isStayExpired(checkIn: string, today: string): boolean {
  return daysBetween(today, checkIn) < 0;
}
