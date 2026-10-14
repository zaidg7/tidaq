import { TRUST, TRUST_SCORE } from './trust';

/** One provider's latest price for a stay, with its checkout-test record if it has one. */
export interface StayOffer {
  providerId: number;
  name: string;
  isDirect: boolean;
  /** Stay total in EUR cents as listed. */
  totalCents: number;
  trust: { score: number; tests: number; matches: number; avgMarkupPct: number | null } | null;
}

export interface RankedOffer extends StayOffer {
  /** "Erwartet an der Kasse": listed × (1 + average markup), when the tests show one. */
  expectedCents: number | null;
  /** What the ranking uses: the expected price if known, else the listed one. */
  trustedCents: number;
}

/**
 * The expected checkout total (PLAN §8.3): only with enough tests (`TRUST.minTests`) and an
 * average markup above the pass threshold; otherwise null (we don't guess).
 */
export function expectedCheckoutCents(offer: StayOffer): number | null {
  const t = offer.trust;
  if (!t || t.tests < TRUST.minTests || t.avgMarkupPct === null) return null;
  if (t.avgMarkupPct / 100 <= TRUST_SCORE.passMarkup) return null;
  return Math.round(offer.totalCents * (1 + t.avgMarkupPct / 100));
}

/**
 * Provider table order (PLAN §8.3): by trusted price, so a teaser price from a provider that
 * usually charges more at checkout doesn't sit on top. Commission never plays a role. Ties: the
 * lower listed price, then the hotel's own site, then the name.
 */
export function rankOffers(offers: readonly StayOffer[]): RankedOffer[] {
  return offers
    .map((o) => {
      const expectedCents = expectedCheckoutCents(o);
      return { ...o, expectedCents, trustedCents: expectedCents ?? o.totalCents };
    })
    .sort(
      (a, b) =>
        a.trustedCents - b.trustedCents ||
        a.totalCents - b.totalCents ||
        Number(b.isDirect) - Number(a.isDirect) ||
        a.name.localeCompare(b.name),
    );
}
