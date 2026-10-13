import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeHotelInfo } from './normalize';
import {
  XOTELO,
  isXoteloTask,
  xoteloOutcome,
  xoteloPriceItems,
  xoteloRatesUrl,
  xoteloTaskId,
} from './xotelo';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'xotelo');
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as Record<string, unknown> & {
    _stay: { check_in: string; check_out: string; nights: number };
  };
const stayOf = (f: ReturnType<typeof fixture>) => ({
  checkIn: f._stay.check_in,
  checkOut: f._stay.check_out,
});

/** The aliases the collector loads (provider_aliases), as far as these fixtures need them. */
const ALIASES = new Map([
  ['booking.com', 'booking-com'],
  ['agoda.com', 'agoda'],
  ['trip.com', 'trip-com'],
  ['ritzcarlton.com', 'hotel-direct'],
  ['fourseasons.com', 'hotel-direct'],
  ['autograph', 'hotel-direct'],
  ['waldorf astoria', 'hotel-direct'],
]);

describe('xoteloRatesUrl and task ids', () => {
  it('asks for one stay in EUR', () => {
    const url = new URL(
      xoteloRatesUrl({
        hotelKey: 'g187323-d289019',
        checkIn: '2026-12-04',
        checkOut: '2026-12-06',
        adults: 2,
      }),
    );
    expect(url.origin + url.pathname).toBe(XOTELO.ratesUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      hotel_key: 'g187323-d289019',
      chk_in: '2026-12-04',
      chk_out: '2026-12-06',
      adults: '2',
      currency: 'EUR',
    });
  });

  it('builds task ids that never look like DataForSEO ids', () => {
    expect(xoteloTaskId(41, 312)).toBe('xo-41-312');
    expect(isXoteloTask('xo-41-312')).toBe(true);
    expect(isXoteloTask('10121635-1535-0399-0000-a7d5f6a2b9c1')).toBe(false);
  });
});

describe('xoteloPriceItems', () => {
  it('turns rates into price items, with a domain only for site names', () => {
    const items = xoteloPriceItems([
      { code: 'BookingCom', name: 'Booking.com', rate: 316, tax: null },
      { code: 'IHG', name: 'IHG', rate: 300, tax: 21 },
      { code: 'X', name: 'Broken', rate: null, tax: null },
    ]);
    expect(items.map((i) => [i.title, i.domain, i.price])).toEqual([
      ['Booking.com', 'booking.com', 316],
      ['IHG', null, 321],
      ['Broken', null, null],
    ]);
    expect(items.every((i) => !i.official_site && !i.is_paid && i.currency === 'EUR')).toBe(true);
  });
});

describe('xoteloOutcome on recorded responses', () => {
  it('reads a normal answer: every site, cheapest nightly price', () => {
    const f = fixture('rates-ritz-carlton-berlin');
    const out = xoteloOutcome(f, stayOf(f));
    expect(out.kind).toBe('done');
    if (out.kind !== 'done') return;
    expect(out.result.prices?.items).toHaveLength(5);
    expect(out.result.prices?.price).toBe(316);
  });

  it('feeds normalizeHotelInfo: aliases, brand site as hotel direct, stay totals', () => {
    for (const name of [
      'rates-ritz-carlton-berlin',
      'rates-george-v-paris',
      'rates-atlantic-hamburg',
      'rates-waldorf-berlin',
    ]) {
      const f = fixture(name);
      const out = xoteloOutcome(f, stayOf(f));
      if (out.kind !== 'done') throw new Error(`${name}: ${out.kind}`);
      const norm = normalizeHotelInfo(out.result, f._stay.nights, ALIASES);
      expect(
        norm.offers.some((o) => o.providerSlug === 'booking-com'),
        name,
      ).toBe(true);
      expect(
        norm.offers.some((o) => o.providerSlug === 'hotel-direct'),
        name,
      ).toBe(true);
      for (const o of norm.offers) expect(o.totalCents).toBe(o.nightlyCents * f._stay.nights);
    }
    // Unknown sites become pending providers by their domain, like DataForSEO sources.
    const f = fixture('rates-ritz-carlton-berlin');
    const out = xoteloOutcome(f, stayOf(f));
    if (out.kind !== 'done') throw new Error(out.kind);
    const vio = normalizeHotelInfo(out.result, 2, ALIASES).offers.find(
      (o) => o.sourceName === 'Vio.com',
    );
    expect(vio).toMatchObject({
      providerSlug: null,
      sourceSlug: 'vio-com',
      sourceDomain: 'vio.com',
    });
  });

  it('handles a single site, no rates and API errors', () => {
    const single = fixture('rates-single-ritz-london');
    expect(xoteloOutcome(single, { checkIn: '2026-10-23', checkOut: '2026-10-25' }).kind).toBe(
      'done',
    );
    const empty = fixture('rates-empty-unknown-hotel');
    expect(xoteloOutcome(empty, { checkIn: '2026-10-23', checkOut: '2026-10-25' })).toEqual({
      kind: 'no_results',
    });
    const error = fixture('rates-error-bad-date');
    expect(xoteloOutcome(error, { checkIn: '2026-13-40', checkOut: '2026-10-25' })).toEqual({
      kind: 'failed',
      error: '400 chk_in=2026-13-40 is invalid date',
    });
  });

  it('rejects answers for another stay, another currency or an unknown shape', () => {
    const f = fixture('rates-waldorf-berlin');
    expect(xoteloOutcome(f, { checkIn: '2026-01-01', checkOut: '2026-01-03' }).kind).toBe('failed');
    const usd = { error: null, result: { chk_in: 'a', chk_out: 'b', currency: 'USD', rates: [] } };
    expect(xoteloOutcome(usd, { checkIn: 'a', checkOut: 'b' })).toEqual({
      kind: 'failed',
      error: 'currency USD',
    });
    expect(xoteloOutcome({ error: null, result: null }, { checkIn: 'a', checkOut: 'b' })).toEqual({
      kind: 'failed',
      error: 'empty result',
    });
    expect(xoteloOutcome('<html>', { checkIn: 'a', checkOut: 'b' })).toEqual({
      kind: 'failed',
      error: 'unexpected response shape',
    });
    // Rates without a usable price count as no results.
    const noPrice = {
      error: null,
      result: {
        chk_in: 'a',
        chk_out: 'b',
        currency: 'EUR',
        rates: [{ code: 'X', name: 'X', rate: null }],
      },
    };
    expect(xoteloOutcome(noPrice, { checkIn: 'a', checkOut: 'b' })).toEqual({ kind: 'no_results' });
  });
});
