import { describe, expect, it } from 'vitest';
import { expectedCheckoutCents, rankOffers, type StayOffer } from './offers';

const offer = (over: Partial<StayOffer> & Pick<StayOffer, 'name' | 'totalCents'>): StayOffer => ({
  providerId: over.name.length,
  isDirect: false,
  trust: null,
  ...over,
});
const tested = (avgMarkupPct: number | null, tests = 10) => ({
  score: 80,
  tests,
  matches: tests - 2,
  avgMarkupPct,
});

describe('expectedCheckoutCents', () => {
  it('adds the average markup when enough tests show one', () => {
    expect(expectedCheckoutCents(offer({ name: 'A', totalCents: 100_000, trust: tested(8) }))).toBe(
      108_000,
    );
  });

  it("doesn't guess without enough tests, without a markup or with a passing one", () => {
    expect(expectedCheckoutCents(offer({ name: 'A', totalCents: 100_000 }))).toBeNull();
    expect(
      expectedCheckoutCents(offer({ name: 'A', totalCents: 100_000, trust: tested(8, 4) })),
    ).toBeNull();
    expect(
      expectedCheckoutCents(offer({ name: 'A', totalCents: 100_000, trust: tested(null) })),
    ).toBeNull();
    expect(
      expectedCheckoutCents(offer({ name: 'A', totalCents: 100_000, trust: tested(1) })),
    ).toBeNull();
    expect(
      expectedCheckoutCents(offer({ name: 'A', totalCents: 100_000, trust: tested(-3) })),
    ).toBeNull();
  });
});

describe('rankOffers', () => {
  it('ranks by trusted price: a teaser price with a known markup drops behind', () => {
    const ranked = rankOffers([
      offer({ name: 'Teaser', totalCents: 95_000, trust: tested(12) }), // ≈ 106.400
      offer({ name: 'Booking.com', totalCents: 100_000 }),
      offer({ name: 'Agoda', totalCents: 101_000, trust: tested(0.5) }),
    ]);
    expect(ranked.map((o) => [o.name, o.trustedCents, o.expectedCents])).toEqual([
      ['Booking.com', 100_000, null],
      ['Agoda', 101_000, null],
      ['Teaser', 106_400, 106_400],
    ]);
  });

  it('breaks ties by listed price, then the hotel site, then the name', () => {
    const ranked = rankOffers([
      offer({ name: 'Trip.com', totalCents: 100_000 }),
      offer({ name: 'Agoda', totalCents: 100_000 }),
      offer({ name: 'Hotel', totalCents: 100_000, isDirect: true }),
      offer({ name: 'Marked', totalCents: 98_000, trust: tested(2.05) }), // ≈ 100.009 → 100.009
    ]);
    expect(ranked.map((o) => o.name)).toEqual(['Hotel', 'Agoda', 'Trip.com', 'Marked']);
  });

  it('handles no offers', () => {
    expect(rankOffers([])).toEqual([]);
  });
});
