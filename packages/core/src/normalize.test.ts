import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dfsHotelInfoResponseSchema, type DfsPriceItem } from './dataforseo';
import {
  aliasKey,
  bestOffer,
  DIRECT_PROVIDER,
  normalizeHotelInfo,
  registrableDomain,
  resolveProvider,
  slugify,
  unknownSources,
} from './normalize';

// The seed aliases from supabase/migrations/20261012154726_seed_cities_providers.sql.
const ALIASES = new Map<string, string>([
  ['booking.com', 'booking-com'],
  ['booking', 'booking-com'],
  ['expedia', 'expedia'],
  ['expedia.de', 'expedia'],
  ['expedia.com', 'expedia'],
  ['hotels.com', 'hotels-com'],
  ['trip.com', 'trip-com'],
  ['agoda', 'agoda'],
  ['agoda.com', 'agoda'],
  ['hrs', 'hrs'],
  ['hrs.de', 'hrs'],
  ['hrs.com', 'hrs'],
  ['check24', 'check24'],
  ['check24.de', 'check24'],
  ['official site', DIRECT_PROVIDER],
  ['offizielle website', DIRECT_PROVIDER],
  ['hotel website', DIRECT_PROVIDER],
]);

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'dataforseo');
function fixture(name: string) {
  const parsed = dfsHotelInfoResponseSchema.parse(
    JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')),
  );
  const result = parsed.tasks[0]?.result?.[0];
  if (!result) throw new Error(`no result in ${name}`);
  return result;
}

function item(partial: Partial<DfsPriceItem>): DfsPriceItem {
  return {
    type: 'hotel_info_price',
    title: 'Booking.com',
    price: 300,
    currency: 'EUR',
    url: 'https://www.booking.com/x',
    domain: 'www.booking.com',
    is_paid: false,
    official_site: false,
    free_cancellation_until: null,
    offers: null,
    ...partial,
  };
}
const withItems = (items: DfsPriceItem[]) => ({
  prices: { price: null, currency: 'EUR', items, prices_by_dates: null },
});

describe('helpers', () => {
  it('finds registrable domains', () => {
    expect(registrableDomain('www.booking.com')).toBe('booking.com');
    expect(registrableDomain('hotel.check24.de')).toBe('check24.de');
    expect(registrableDomain('de.hotels.com')).toBe('hotels.com');
    expect(registrableDomain('www.example.co.uk')).toBe('example.co.uk');
    expect(registrableDomain('Booking.com.')).toBe('booking.com');
  });

  it('slugifies names with umlauts and symbols', () => {
    expect(slugify('Booking.com')).toBe('booking-com');
    expect(slugify('müv AI')).toBe('muev-ai');
    expect(slugify('  Hôtel  Privé ')).toBe('hotel-prive');
    expect(aliasKey('  CHECK24.de ')).toBe('check24.de');
  });

  it('resolves providers by domain, then name; official sites are direct', () => {
    expect(resolveProvider(item({ domain: 'de.hotels.com', title: 'Hotels.com' }), ALIASES)).toBe(
      'hotels-com',
    );
    expect(resolveProvider(item({ domain: 'hotel.check24.de', title: 'X' }), ALIASES)).toBe(
      'check24',
    );
    // Ads carry google.de as domain: only the name counts.
    expect(resolveProvider(item({ domain: 'google.de', title: 'CHECK24.de' }), ALIASES)).toBe(
      'check24',
    );
    expect(resolveProvider(item({ domain: 'google.de', title: 'TUI.com' }), ALIASES)).toBeNull();
    expect(
      resolveProvider(
        item({ domain: 'marriottclk.koddi.com', title: 'The Ritz-Carlton', official_site: true }),
        ALIASES,
      ),
    ).toBe(DIRECT_PROVIDER);
    expect(resolveProvider(item({ domain: null, title: 'Agoda' }), ALIASES)).toBe('agoda');
  });
});

describe('normalizeHotelInfo on spike fixtures', () => {
  const files = readdirSync(FIXTURES).filter((f) => f.startsWith('hotel_info-'));

  it.each(files)('normalizes %s without errors', (file) => {
    const nights = 2;
    const { offers, dropped, medianNightlyCents } = normalizeHotelInfo(
      fixture(file),
      nights,
      ALIASES,
    );
    expect(dropped).toEqual([]);
    expect(offers.length).toBeGreaterThanOrEqual(15);
    expect(medianNightlyCents).toBeGreaterThan(0);
    // One offer per provider, totals are nightly × nights, no Google ad links.
    const keys = offers.map((o) => o.providerSlug ?? `?${o.sourceSlug}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const o of offers) {
      expect(o.totalCents).toBe(o.nightlyCents * nights);
      expect(o.url ?? '').not.toMatch(/google\.[a-z.]+\/aclk/);
      expect(o.raw.nightly).toBe(true);
    }
    const known = offers.filter((o) => o.providerSlug).map((o) => o.providerSlug);
    expect(known).toEqual(expect.arrayContaining(['booking-com', 'hotel-direct']));
    expect(bestOffer(offers)?.eligible).toBe(true);
  });

  it('Adlon 1–3 Dec: best is 284 €/night, Booking.com 338 €', () => {
    const { offers } = normalizeHotelInfo(fixture('hotel_info-info-adlon-dec-id.json'), 2, ALIASES);
    expect(bestOffer(offers)).toMatchObject({
      sourceName: 'Super.com',
      nightlyCents: 28400,
      totalCents: 56800,
    });
    const booking = offers.find((o) => o.providerSlug === 'booking-com');
    expect(booking).toMatchObject({
      nightlyCents: 33800,
      url: expect.stringContaining('booking.com'),
    });
    // Booking.com appears as ad and organic: merged into one offer with the organic link.
    expect(booking?.raw.items.length).toBe(2);
    const direct = offers.find((o) => o.providerSlug === DIRECT_PROVIDER);
    expect(direct).toMatchObject({ isOfficial: true, nightlyCents: 33800 });
  });

  it('Adlon weekend: 2-night totals are flagged and never the best price', () => {
    const { offers } = normalizeHotelInfo(
      fixture('hotel_info-info-adlon-weekend-id.json'),
      2,
      ALIASES,
    );
    const flagged = offers.filter((o) => o.suspectedTotal).map((o) => o.sourceName);
    expect(flagged).toEqual(
      expect.arrayContaining(['Super.com', 'weloveholidays', 'Kiwi.com', 'Billabook.com']),
    );
    expect(flagged.length).toBeGreaterThanOrEqual(8);
    const best = bestOffer(offers);
    expect(best?.nightlyCents).toBe(53600);
    expect(best?.suspectedTotal).toBe(false);
  });

  it('Ritz-Carlton Dec: a 3.6× price stays under the 400 % rule but is never best', () => {
    const { offers } = normalizeHotelInfo(
      fixture('hotel_info-info-ritz-carlton-dec-id.json'),
      2,
      ALIASES,
    );
    const clicktrip = offers.find((o) => o.sourceName === 'Clicktrip.com');
    expect(clicktrip).toMatchObject({ outlier: false, suspectedTotal: false });
    expect(bestOffer(offers)?.sourceName).not.toBe('Clicktrip.com');
    // TUI exists only as an ad and organic entry with the same price: merged, organic link.
    const tui = offers.find((o) => o.sourceSlug === 'tui-com');
    expect(tui?.url).toContain('tui.com');
  });
});

describe('normalizeHotelInfo rules', () => {
  it('drops missing prices, other currencies and nameless sources', () => {
    const { offers, dropped } = normalizeHotelInfo(
      withItems([
        item({ price: null }),
        item({ price: 0 }),
        item({ currency: 'USD' }),
        item({ title: ' ', domain: null }),
        item({}),
      ]),
      2,
      ALIASES,
    );
    expect(dropped.map((d) => d.reason)).toEqual(['no_price', 'no_price', 'currency', 'no_source']);
    expect(offers).toHaveLength(1);
  });

  it('keeps the cheapest entry per provider and the URL of an organic entry', () => {
    const { offers } = normalizeHotelInfo(
      withItems([
        item({ price: 310, is_paid: true, domain: 'google.de', url: 'https://google.de/aclk?x' }),
        item({ price: 320 }),
      ]),
      3,
      ALIASES,
    );
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      nightlyCents: 31000,
      totalCents: 93000,
      url: 'https://www.booking.com/x',
    });
  });

  it('has no link when a provider exists only as an ad', () => {
    const { offers } = normalizeHotelInfo(
      withItems([item({ is_paid: true, domain: 'google.de', url: 'https://google.de/aclk?x' })]),
      2,
      ALIASES,
    );
    expect(offers[0]?.url).toBeNull();
  });

  it('flags outliers below 30 % and above 400 % of the median', () => {
    const items = [
      item({ title: 'A', domain: 'a.com', price: 300 }),
      item({ title: 'B', domain: 'b.com', price: 310 }),
      item({ title: 'C', domain: 'c.com', price: 320 }),
      item({ title: 'Cheap', domain: 'cheap.com', price: 80 }),
      item({ title: 'Huge', domain: 'huge.com', price: 1400 }),
    ];
    const { offers } = normalizeHotelInfo(withItems(items), 1, ALIASES);
    const bySlug = Object.fromEntries(offers.map((o) => [o.sourceSlug, o]));
    expect(bySlug['cheap-com']).toMatchObject({ outlier: true, eligible: false });
    expect(bySlug['huge-com']).toMatchObject({ outlier: true, eligible: false });
    expect(bySlug['a-com']).toMatchObject({ outlier: false, eligible: true });
    expect(bestOffer(offers)?.sourceSlug).toBe('a-com');
  });

  it('does not flag totals for 1-night stays', () => {
    const items = [
      item({ title: 'A', domain: 'a.com', price: 300 }),
      item({ title: 'B', domain: 'b.com', price: 300 }),
      item({ title: 'Double', domain: 'd.com', price: 600 }),
    ];
    const { offers } = normalizeHotelInfo(withItems(items), 1, ALIASES);
    expect(offers.every((o) => !o.suspectedTotal)).toBe(true);
  });

  it('handles empty results and rejects invalid nights', () => {
    const empty = normalizeHotelInfo({ prices: null }, 2, ALIASES);
    expect(empty).toEqual({ offers: [], dropped: [], medianNightlyCents: null });
    expect(bestOffer(empty.offers)).toBeNull();
    expect(() => normalizeHotelInfo({ prices: null }, 0, ALIASES)).toThrow(RangeError);
    expect(() => normalizeHotelInfo({ prices: null }, 31, ALIASES)).toThrow(RangeError);
  });

  it('keeps free cancellation from any entry of the provider', () => {
    const { offers } = normalizeHotelInfo(
      withItems([
        item({ price: 300 }),
        item({
          price: 300,
          is_paid: true,
          domain: 'google.de',
          free_cancellation_until: '2026-12-01 14:00:00 +00:00',
        }),
      ]),
      2,
      ALIASES,
    );
    expect(offers[0]?.freeCancellationUntil).toBe('2026-12-01 14:00:00 +00:00');
  });
});

describe('unknownSources', () => {
  it('lists each unmapped source once with a slug from its domain', () => {
    const { offers } = normalizeHotelInfo(fixture('hotel_info-info-adlon-dec-id.json'), 2, ALIASES);
    const unknown = unknownSources(offers);
    expect(unknown).toContainEqual({
      slug: 'super-com',
      name: 'Super.com',
      domain: 'www.super.com',
    });
    expect(unknown.map((u) => u.slug)).not.toContain('booking-com');
    expect(new Set(unknown.map((u) => u.slug)).size).toBe(unknown.length);
  });
});
