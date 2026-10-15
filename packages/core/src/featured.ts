import { addDays } from './dates';
import type { StayState } from './db';
import { STATS } from './stats';

/** Minimal fields of a stay row (`v_stay_public`) needed to choose the homepage example. */
export interface FeaturedCandidate {
  stayId: number;
  checkIn: string;
  daysTracked: number | null;
  state: StayState | null;
  nowCents: number | null;
  /** The hotel has a licensed photo. */
  hasImage: boolean;
}

/** The homepage example should not check in within this many days (prices move fast then). */
export const FEATURED_MIN_LEAD_DAYS = 7;

const STATE_ORDER: Record<StayState, number> = {
  near_low: 0,
  good: 1,
  normal: 2,
  high: 3,
  collecting: 4,
};

/**
 * Picks the stay for the homepage "live example" (C-020b): the most history first, then the
 * most useful verdict (near the low or a good price), then a hotel with a photo, then the
 * nearest check-in at least a week ahead. With `prefer: 'cheap'` a stay with a cheap verdict
 * (good or near the low) wins first. Null when no stay has a price yet.
 */
export function pickFeaturedStay<T extends FeaturedCandidate>(
  rows: readonly T[],
  today: string,
  /** `cheap`: a stay whose verdict says cheap right now comes first (homepage result card). */
  prefer: 'history' | 'cheap' = 'history',
): T | null {
  const earliest = addDays(today, FEATURED_MIN_LEAD_DAYS);
  const candidates = rows.filter(
    (r) => r.nowCents !== null && (r.daysTracked ?? 0) > 0 && r.checkIn >= earliest,
  );
  const cheapNow = (r: T) =>
    prefer === 'cheap' &&
    (r.daysTracked ?? 0) >= STATS.minDays &&
    (r.state === 'good' || r.state === 'near_low');
  candidates.sort(
    (a, b) =>
      Number(cheapNow(b)) - Number(cheapNow(a)) ||
      (b.daysTracked ?? 0) - (a.daysTracked ?? 0) ||
      STATE_ORDER[a.state ?? 'collecting'] - STATE_ORDER[b.state ?? 'collecting'] ||
      Number(b.hasImage) - Number(a.hasImage) ||
      a.checkIn.localeCompare(b.checkIn) ||
      a.stayId - b.stayId,
  );
  return candidates[0] ?? null;
}
