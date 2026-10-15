import { describe, expect, it } from 'vitest';
import { localizedPath } from './paths';
import { ADULTS, cityStayPath, hotelPath, parseStayParams, stayPath } from './stayParams';

describe('parseStayParams', () => {
  it('reads a valid stay with adults', () => {
    expect(parseStayParams('2026-12-04--2026-12-06', '3')).toEqual({
      ok: true,
      params: { checkIn: '2026-12-04', checkOut: '2026-12-06', nights: 2, adults: 3 },
      canonical: true,
    });
  });

  it('defaults to 2 adults when the value is missing, without a redirect', () => {
    const r = parseStayParams('2026-12-04--2026-12-06');
    expect(r).toMatchObject({ ok: true, params: { adults: ADULTS.default }, canonical: true });
  });

  it('asks for a redirect when adults is invalid', () => {
    for (const bad of ['0', '5', '2.5', 'abc', '', ' 2', '-1', '02x']) {
      expect(parseStayParams('2026-12-04--2026-12-06', bad)).toMatchObject({
        ok: true,
        params: { adults: 2 },
        canonical: false,
      });
    }
    // Repeated parameters: the first one counts.
    expect(parseStayParams('2026-12-04--2026-12-06', ['4', '1'])).toMatchObject({
      params: { adults: 4 },
      canonical: true,
    });
  });

  it('rejects malformed and impossible dates', () => {
    for (const bad of [
      '2026-12-04',
      '2026-12-04--',
      '2026-12-04-2026-12-06',
      '2026-12-04--2026-12-06--2026-12-08',
      '2026-02-30--2026-03-02',
      '26-12-04--26-12-06',
      'adlon--berlin',
    ]) {
      expect(parseStayParams(bad, '2')).toEqual({ ok: false, reason: 'format' });
    }
  });

  it('rejects check-out on or before check-in', () => {
    expect(parseStayParams('2026-12-06--2026-12-06')).toEqual({ ok: false, reason: 'order' });
    expect(parseStayParams('2026-12-06--2026-12-04')).toEqual({ ok: false, reason: 'order' });
  });

  it('allows 30 nights, not 31, across a month and year end', () => {
    expect(parseStayParams('2026-12-15--2027-01-14')).toMatchObject({
      ok: true,
      params: { nights: 30 },
    });
    expect(parseStayParams('2026-12-15--2027-01-15')).toEqual({ ok: false, reason: 'too_long' });
  });

  it('accepts leap days and past stays', () => {
    expect(parseStayParams('2028-02-28--2028-03-01')).toMatchObject({ params: { nights: 2 } });
    expect(parseStayParams('2020-01-01--2020-01-02')).toMatchObject({ ok: true });
  });
});

describe('stayPath', () => {
  it('builds the canonical path, localized by the caller', () => {
    const path = stayPath('hotel-adlon-kempinski-berlin', '2026-12-04', '2026-12-06', 2);
    expect(path).toBe('/hotel/hotel-adlon-kempinski-berlin/2026-12-04--2026-12-06?adults=2');
    expect(localizedPath(path, 'en')).toBe(`/en${path}`);
    expect(localizedPath(path, 'de')).toBe(path);
  });
});

describe('hotelPath', () => {
  it('is the stay path without the dates', () => {
    expect(hotelPath('aman-tokyo')).toBe('/hotel/aman-tokyo');
  });
});

describe('cityStayPath', () => {
  it('puts the dates in a query the stay parser reads', () => {
    const path = cityStayPath('wien', '2026-11-06', '2026-11-08', 3);
    expect(path).toBe('/stadt/wien?daten=2026-11-06--2026-11-08&adults=3');
    const daten = new URL(path, 'https://tidaq.com').searchParams.get('daten') ?? '';
    expect(parseStayParams(daten, '3')).toMatchObject({ ok: true, params: { nights: 2 } });
  });
});
