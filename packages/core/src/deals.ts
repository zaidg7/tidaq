/**
 * Deals of the week (PLAN §7 `/deals`, homepage section): stays clearly below their own 30-day
 * average, with enough history that the average means something.
 */
export const DEALS = {
  /** Only stays with at least this many days of data. */
  minDays: 14,
  /** At least this far below the 30-day average (−0.08 = 8 %). */
  minDrop: -0.08,
} as const;

export interface DealCandidate {
  stayId: number;
  hotelSlug: string;
  nowCents: number | null;
  avg30Cents: number | null;
  daysTracked: number | null;
}

/** The biggest drops, one stay per hotel, at most `limit`. Ties: more history first. */
export function pickDeals<T extends DealCandidate>(
  rows: readonly T[],
  limit = 3,
): (T & { drop: number })[] {
  const scored = rows
    .filter(
      (r) =>
        (r.daysTracked ?? 0) >= DEALS.minDays && r.nowCents !== null && (r.avg30Cents ?? 0) > 0,
    )
    .map((r) => ({
      ...r,
      drop: ((r.nowCents as number) - (r.avg30Cents as number)) / (r.avg30Cents as number),
    }))
    .filter((r) => r.drop <= DEALS.minDrop)
    .sort(
      (a, b) =>
        a.drop - b.drop || (b.daysTracked ?? 0) - (a.daysTracked ?? 0) || a.stayId - b.stayId,
    );
  const seen = new Set<string>();
  const out: (T & { drop: number })[] = [];
  for (const r of scored) {
    if (seen.has(r.hotelSlug)) continue;
    seen.add(r.hotelSlug);
    out.push(r);
    if (out.length === limit) break;
  }
  return out;
}
