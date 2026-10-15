/**
 * Live check of Price Drops (C-139). A drop comes from the night grid, which is priced once a day,
 * so by the afternoon many drops were already gone on the booking site (Zaid, 15 Oct). The
 * collector asks the price source again for each drop's exact trip (its hotel, dates and site)
 * every `staleMinutes`, and the radar hides drops that no longer hold.
 */
export const DROP_CHECK = {
  /** A drop is checked again once its last check is this old. */
  staleMinutes: 30,
  /**
   * Drops per collect run (C-142: they share the 2-minute run with the night grid, which gets the
   * rest of the 50 requests). 12 × 30 runs an hour covers ~180 drops every 30 minutes.
   */
  batch: 12,
  /** Still "live" while the site's price is at most this much above the drop price. */
  tolerance: 0.05,
} as const;

export interface DropCheckOffer {
  /** Provider slug (`providers.slug`) the offer resolved to. */
  slug: string;
  /** Total for the whole trip, cents. */
  totalCents: number;
}

export interface DropCheckResult {
  /** The drop's site still offers the trip at (about) the drop price. */
  live: boolean;
  /** The drop's site's total now, null when it no longer offers the trip. */
  cents: number | null;
  /** The cheapest total of any site now, null without offers. */
  bestCents: number | null;
}

/**
 * Judges one check: is the drop still there on the site we name? An empty answer (sold out) or a
 * missing site means gone; a price more than `tolerance` above the drop price means gone too. A
 * lower price than before keeps it live (the radar then shows the lower price).
 */
export function judgeDropCheck(
  drop: { providerSlug: string; nowCents: number },
  offers: readonly DropCheckOffer[],
): DropCheckResult {
  const ofSite = offers.filter((o) => o.slug === drop.providerSlug).map((o) => o.totalCents);
  const cents = ofSite.length ? Math.min(...ofSite) : null;
  const bestCents = offers.length ? Math.min(...offers.map((o) => o.totalCents)) : null;
  const live = cents !== null && cents <= Math.round(drop.nowCents * (1 + DROP_CHECK.tolerance));
  return { live, cents, bestCents };
}
