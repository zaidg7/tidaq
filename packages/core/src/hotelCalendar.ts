import { dayDiff, shiftDays, weekdayMonFirst } from './calendar';

/**
 * Hotel page price calendar (C-023a): today's price of every night from the night grid (D-42).
 * Pure: the page loads the nights, these turn them into levels and stay totals.
 */

/** One night as collected on the latest day: cheapest reviewed price and every platform's. */
export interface NightPrice {
  /** The night (check-in date), `YYYY-MM-DD`. */
  night: string;
  /** Cheapest reviewed platform, null when none priced it. */
  bestCents: number | null;
  /** `{ "<provider id>": cents }`, every platform incl. pending ones. */
  perProvider: Readonly<Record<string, number>>;
}

/** Number of price levels (DESIGN.md calendar cell: 5 tints from good to bad). */
export const PRICE_LEVELS = 5;

/**
 * Level 0 (cheapest fifth) … 4 (dearest fifth) for each price, by its rank among the priced
 * nights. Null for nights without a price. All prices equal → the middle level.
 */
export function priceLevels(cents: readonly (number | null)[]): (number | null)[] {
  const sorted = cents.filter((c): c is number => c !== null).sort((a, b) => a - b);
  const n = sorted.length;
  const allSame = n > 0 && sorted[0] === sorted[n - 1];
  return cents.map((c) => {
    if (c === null) return null;
    if (allSame) return Math.floor(PRICE_LEVELS / 2);
    // Ties share the level of their first rank, so equal prices always look the same.
    const rank = sorted.indexOf(c);
    return Math.min(PRICE_LEVELS - 1, Math.floor((rank / n) * PRICE_LEVELS));
  });
}

export type StayTotal =
  | { kind: 'ok'; totalCents: number; providerId: number; nights: number }
  /** Some nights of the stay have no price (not collected yet or beyond the grid). */
  | { kind: 'missing'; nights: number; missing: number }
  /** Every night is priced, but no reviewed platform priced all of them. */
  | { kind: 'none'; nights: number };

/**
 * The stay check-in → check-out from its nights, like SQL `stay_history_from_nights` (C-070b):
 * a stay is booked on one site, so the total is the cheapest reviewed platform that priced every
 * night; platforms are never mixed across nights.
 */
export function stayFromNights(
  nights: readonly NightPrice[],
  checkIn: string,
  checkOut: string,
  reviewed: ReadonlySet<number>,
): StayTotal {
  const count = dayDiff(checkIn, checkOut);
  if (count < 1) throw new RangeError(`check-out ${checkOut} is not after check-in ${checkIn}`);
  const byNight = new Map(nights.map((n) => [n.night, n]));
  const stay: NightPrice[] = [];
  for (let i = 0; i < count; i++) {
    const n = byNight.get(shiftDays(checkIn, i));
    if (n) stay.push(n);
  }
  if (stay.length < count) return { kind: 'missing', nights: count, missing: count - stay.length };

  let best: { totalCents: number; providerId: number } | null = null;
  for (const id of reviewed) {
    let total = 0;
    let all = true;
    for (const n of stay) {
      const cents = n.perProvider[String(id)];
      if (cents === undefined || !Number.isInteger(cents) || cents <= 0) {
        all = false;
        break;
      }
      total += cents;
    }
    if (
      all &&
      (!best || total < best.totalCents || (total === best.totalCents && id < best.providerId))
    ) {
      best = { totalCents: total, providerId: id };
    }
  }
  return best ? { kind: 'ok', ...best, nights: count } : { kind: 'none', nights: count };
}

/** The kinds of stay the hotel page highlights, as in the stay grid (PLAN §7.1). */
export const BEST_STAY_KINDS = {
  /** Friday → Sunday (`weekdayMonFirst`: Monday = 0). */
  weekend: { checkInWeekday: 4, nights: 2 },
  /** Tuesday → Thursday. */
  midweek: { checkInWeekday: 1, nights: 2 },
} as const;

export type BestStayKind = keyof typeof BEST_STAY_KINDS;

export interface BestStay {
  checkIn: string;
  checkOut: string;
  totalCents: number;
  providerId: number;
  nights: number;
}

/**
 * The cheapest upcoming weekend (Fri → Sun) and midweek (Tue → Thu) stay among the nights, each
 * on one reviewed site (same rule as `stayFromNights`). Check-in strictly after `today`, like the
 * stay grid. Ties go to the earlier date. Null when no such stay has a total.
 */
export function cheapestStays(
  nights: readonly NightPrice[],
  today: string,
  reviewed: ReadonlySet<number>,
): Record<BestStayKind, BestStay | null> {
  const result: Record<BestStayKind, BestStay | null> = { weekend: null, midweek: null };
  for (const kind of Object.keys(BEST_STAY_KINDS) as BestStayKind[]) {
    const { checkInWeekday, nights: count } = BEST_STAY_KINDS[kind];
    for (const { night } of nights) {
      if (night <= today || weekdayMonFirst(night) !== checkInWeekday) continue;
      const checkOut = shiftDays(night, count);
      const stay = stayFromNights(nights, night, checkOut, reviewed);
      const best = result[kind];
      // Nights come oldest first, so `<` keeps the earlier date on a tie.
      if (stay.kind === 'ok' && (!best || stay.totalCents < best.totalCents)) {
        result[kind] = {
          checkIn: night,
          checkOut,
          totalCents: stay.totalCents,
          providerId: stay.providerId,
          nights: count,
        };
      }
    }
  }
  return result;
}

export interface WeekendStay {
  checkIn: string;
  checkOut: string;
  totalCents: number;
}

/**
 * Every upcoming Friday → Sunday stay with a total on one reviewed site (`stayFromNights`),
 * check-in after `today`, by date. Feeds the search calendar's "Flexibel" tab (C-108).
 */
export function weekendStays(
  nights: readonly NightPrice[],
  today: string,
  reviewed: ReadonlySet<number>,
): WeekendStay[] {
  const { checkInWeekday, nights: count } = BEST_STAY_KINDS.weekend;
  const out: WeekendStay[] = [];
  for (const { night } of nights) {
    if (night <= today || weekdayMonFirst(night) !== checkInWeekday) continue;
    const checkOut = shiftDays(night, count);
    const stay = stayFromNights(nights, night, checkOut, reviewed);
    if (stay.kind === 'ok') out.push({ checkIn: night, checkOut, totalCents: stay.totalCents });
  }
  return out;
}

/** The `n` cheapest of `stays` whose check-in falls in `month` (`YYYY-MM-01`), cheapest first. */
export function cheapestInMonth<S extends { checkIn: string; totalCents: number }>(
  stays: readonly S[],
  month: string,
  n = 3,
): S[] {
  const prefix = month.slice(0, 7);
  return stays
    .filter((s) => s.checkIn.startsWith(prefix))
    .sort((a, b) => a.totalCents - b.totalCents || a.checkIn.localeCompare(b.checkIn))
    .slice(0, n);
}
