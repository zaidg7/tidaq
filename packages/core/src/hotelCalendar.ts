import { dayDiff, shiftDays } from './calendar';

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
