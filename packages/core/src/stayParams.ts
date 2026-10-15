import { STAY_LIMITS, dayDiff } from './calendar';

/**
 * Stay page URL (C-022): `/hotel/<slug>/<check-in>--<check-out>?adults=<1–4>`. Shared by the
 * route, the search card and every link to a stay, so they can't drift apart.
 */

export const ADULTS = { min: 1, max: 4, default: 2 } as const;

export interface StayParams {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
}

export type StayParamsResult =
  | {
      ok: true;
      params: StayParams;
      /** False when `adults` was present but invalid: redirect to the canonical URL. */
      canonical: boolean;
    }
  | { ok: false; reason: 'format' | 'order' | 'too_long' };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date (`2026-02-30` is not). */
function isRealDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Validates the `<check-in>--<check-out>` segment and the `adults` query value. Past stays are
 * valid (the page explains them); malformed dates, check-out on or before check-in and stays
 * over 30 nights are not. A missing `adults` means 2; an invalid one asks for a redirect.
 */
export function parseStayParams(range: string, adults?: string | string[]): StayParamsResult {
  const [checkIn = '', checkOut = '', ...rest] = range.split('--');
  if (rest.length || !isRealDate(checkIn) || !isRealDate(checkOut)) {
    return { ok: false, reason: 'format' };
  }
  const nights = dayDiff(checkIn, checkOut);
  if (nights < 1) return { ok: false, reason: 'order' };
  if (nights > STAY_LIMITS.maxNights) return { ok: false, reason: 'too_long' };

  const raw = Array.isArray(adults) ? adults[0] : adults;
  const n = raw !== undefined && /^\d$/.test(raw) ? Number(raw) : NaN;
  const valid = n >= ADULTS.min && n <= ADULTS.max;
  return {
    ok: true,
    params: { checkIn, checkOut, nights, adults: valid ? n : ADULTS.default },
    canonical: valid || raw === undefined,
  };
}

/** The stay page path without locale prefix: `/hotel/adlon/2026-12-04--2026-12-06?adults=2`. */
export function stayPath(slug: string, checkIn: string, checkOut: string, adults: number): string {
  return `/hotel/${slug}/${checkIn}--${checkOut}?adults=${adults}`;
}

/** The hotel page path without locale prefix: `/hotel/adlon` (C-023a). */
export function hotelPath(slug: string): string {
  return `/hotel/${slug}`;
}

/**
 * A city page with dates (C-110): `/stadt/wien?daten=2026-11-06--2026-11-08&adults=2`. The page
 * then sorts its hotels by the total for those dates. `daten` parses like a stay range.
 */
export function cityStayPath(
  citySlug: string,
  checkIn: string,
  checkOut: string,
  adults: number,
): string {
  return `/stadt/${citySlug}?daten=${checkIn}--${checkOut}&adults=${adults}`;
}
