import { describe, expect, it } from 'vitest';
import {
  extrasByCount,
  hasProviderPage,
  percentOf,
  providerFactsSchema,
  providerPath,
} from './providerFacts';

const provider = {
  slug: 'booking-com',
  name: 'Booking.com',
  is_direct: false,
  hotels: 76,
  nights: 8552,
  compared: 8548,
  cheapest: 3576,
  median_gap_pct: 6.6,
  tests: 2,
  matches: 1,
  higher: 1,
  lower: 0,
  unavailable: 0,
  avg_markup_pct: 6,
  score: 72,
  extras: { city_tax: 1, fees: 1 },
  first_test: '2026-10-15',
  last_test: '2026-10-15',
};

// The shape `provider_facts()` returned on 14 Oct 2026 (one test provider made up).
const facts = {
  day: '2026-10-14',
  hotels: 83,
  cities: 27,
  nights: 9247,
  providers: [provider],
  accuracy: {
    days: 1,
    since: '2026-10-14',
    pairs: 813,
    within_3: 545,
    stays: 248,
    stays_within_3: 165,
    median_gap_pct: 0.7,
  },
  tests: { n: 2, providers: 1, last: '2026-10-15' },
};

describe('providerFactsSchema', () => {
  it('accepts the SQL result', () => {
    expect(providerFactsSchema.parse(facts).providers[0]?.slug).toBe('booking-com');
  });

  it('accepts an empty database (no grid, no tests, no accuracy days)', () => {
    const empty = {
      ...facts,
      day: null,
      nights: 0,
      providers: [],
      accuracy: {
        days: 0,
        since: null,
        pairs: 0,
        within_3: 0,
        stays: 0,
        stays_within_3: 0,
        median_gap_pct: null,
      },
      tests: { n: 0, providers: 0, last: null },
    };
    expect(providerFactsSchema.parse(empty).accuracy.days).toBe(0);
  });

  it('rejects bad slugs, negative counts and out-of-range scores', () => {
    const bad = (p: object) =>
      providerFactsSchema.safeParse({ ...facts, providers: [{ ...provider, ...p }] }).success;
    expect(bad({ slug: '../x' })).toBe(false);
    expect(bad({ nights: -1 })).toBe(false);
    expect(bad({ score: 101 })).toBe(false);
    expect(bad({ last_test: '15.10.2026' })).toBe(false);
  });
});

describe('providerPath', () => {
  it('builds the provider page path', () => {
    expect(providerPath('booking-com')).toBe('/anbieter/booking-com');
  });
});

describe('percentOf', () => {
  it('rounds to whole percent', () => {
    expect(percentOf(3576, 8548)).toBe(42);
    expect(percentOf(165, 248)).toBe(67);
    expect(percentOf(1, 1)).toBe(100);
    expect(percentOf(0, 5)).toBe(0);
  });

  it('is null without a total', () => {
    expect(percentOf(0, 0)).toBeNull();
    expect(percentOf(3, Number.NaN)).toBeNull();
  });
});

describe('hasProviderPage', () => {
  it('needs grid prices or a test', () => {
    expect(hasProviderPage({ nights: 0, tests: 0 })).toBe(false);
    expect(hasProviderPage({ nights: 10, tests: 0 })).toBe(true);
    expect(hasProviderPage({ nights: 0, tests: 1 })).toBe(true);
  });
});

describe('extrasByCount', () => {
  it('orders by count, ties in display order, and drops unknown or zero keys', () => {
    expect(
      extrasByCount({ fees: 2, city_tax: 2, other_room: 5, typo: 9, breakfast_missing: 0 }),
    ).toEqual([
      { key: 'other_room', n: 5 },
      { key: 'city_tax', n: 2 },
      { key: 'fees', n: 2 },
    ]);
    expect(extrasByCount({})).toEqual([]);
  });
});
