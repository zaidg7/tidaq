import { describe, expect, it } from 'vitest';
import { goPath, hasOutboundSearch, outboundUrl, safeHttpsUrl, withAffiliate } from './outbound';

const hotel = {
  name: 'Hotel Adlon Kempinski',
  city: 'Berlin',
  officialUrl: 'https://www.kempinski.com/adlon',
};
const stay = { checkIn: '2026-12-04', checkOut: '2026-12-06', adults: 2 };
const provider = (slug: string, isDirect = false, affiliateTemplate: string | null = null) => ({
  slug,
  isDirect,
  affiliateTemplate,
});

describe('outboundUrl', () => {
  it('opens the provider search for the hotel, the dates and the guests', () => {
    const url = new URL(outboundUrl(provider('booking-com'), hotel, stay, 'de') ?? '');
    expect(url.origin + url.pathname).toBe('https://www.booking.com/searchresults.de.html');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      ss: 'Hotel Adlon Kempinski Berlin',
      checkin: '2026-12-04',
      checkout: '2026-12-06',
      group_adults: '2',
    });
    expect(outboundUrl(provider('booking-com'), hotel, stay, 'en')).toContain(
      'searchresults.en-gb',
    );
  });

  it('builds every known search, with nights where a site wants them', () => {
    for (const slug of ['agoda', 'trip-com', 'hotels-com', 'expedia']) {
      const url = outboundUrl(provider(slug), hotel, stay, 'de');
      expect(url).toMatch(/^https:\/\//);
      expect(url).toContain('2026-12-04');
    }
    expect(outboundUrl(provider('agoda'), hotel, stay, 'de')).toContain('los=2');
    expect(hasOutboundSearch('booking-com')).toBe(true);
    expect(hasOutboundSearch('check24')).toBe(false);
    expect(hasOutboundSearch('toString')).toBe(false);
  });

  it("opens the hotel's own page with the dates where we know it (C-133)", () => {
    const agoda = new URL(
      outboundUrl(
        provider('agoda'),
        { ...hotel, page: 'hotel-adlon-kempinski/hotel/berlin-de.html' },
        stay,
        'de',
      ) ?? '',
    );
    expect(agoda.origin + agoda.pathname).toBe(
      'https://www.agoda.com/de-de/hotel-adlon-kempinski/hotel/berlin-de.html',
    );
    expect(Object.fromEntries(agoda.searchParams)).toMatchObject({
      checkIn: '2026-12-04',
      los: '2',
      adults: '2',
      rooms: '1',
    });
    const trip = new URL(
      outboundUrl(provider('trip-com'), { ...hotel, page: '1587250' }, stay, 'en') ?? '',
    );
    expect(trip.origin + trip.pathname).toBe('https://uk.trip.com/hotels/detail/');
    expect(Object.fromEntries(trip.searchParams)).toMatchObject({
      hotelId: '1587250',
      checkIn: '2026-12-04',
      checkOut: '2026-12-06',
      adult: '2',
    });
  });

  it('falls back to the search for a malformed page or a provider without pages', () => {
    for (const [slug, page] of [
      ['agoda', '../evil.html'],
      ['agoda', '1587250'],
      ['trip-com', 'hotel-adlon-kempinski/hotel/berlin-de.html'],
      ['booking-com', '1587250'],
    ] as const) {
      const url = outboundUrl(provider(slug), { ...hotel, page }, stay, 'de') ?? '';
      expect(url, slug).toContain('Hotel+Adlon+Kempinski+Berlin');
    }
  });

  it('sends the hotel-direct provider to the official site, only over https', () => {
    expect(outboundUrl(provider('hotel-direct', true), hotel, stay, 'de')).toBe(
      'https://www.kempinski.com/adlon',
    );
    const bad = ['http://example.com', 'javascript:alert(1)', 'https://u:p@example.com', null];
    for (const officialUrl of bad) {
      expect(
        outboundUrl(provider('hotel-direct', true), { ...hotel, officialUrl }, stay, 'de'),
      ).toBeNull();
    }
  });

  it('has no target for unknown providers', () => {
    expect(outboundUrl(provider('check24'), hotel, stay, 'de')).toBeNull();
  });

  it('applies the affiliate template', () => {
    const url = outboundUrl(
      provider('booking-com', false, 'https://partner.example/click?id=42&url={url}'),
      hotel,
      stay,
      'de',
    );
    expect(url).toMatch(
      /^https:\/\/partner\.example\/click\?id=42&url=https%3A%2F%2Fwww\.booking\.com/,
    );
  });
});

describe('withAffiliate', () => {
  it('ignores missing, broken or non-https templates', () => {
    const target = 'https://www.booking.com/x';
    expect(withAffiliate(target, null)).toBe(target);
    expect(withAffiliate(target, 'https://partner.example/click')).toBe(target);
    expect(withAffiliate(target, 'http://partner.example/?u={url}')).toBe(target);
    expect(withAffiliate(target, '?')).toBe(target);
  });

  it('wraps the target in a {url} template', () => {
    expect(
      withAffiliate('https://www.booking.com/x?a=1', 'https://p.example/c?id=7&url={url}'),
    ).toBe('https://p.example/c?id=7&url=https%3A%2F%2Fwww.booking.com%2Fx%3Fa%3D1');
  });

  it('adds query-template parameters to the target (Trip.com, C-050a)', () => {
    const tpl = '?Allianceid=11087826&SID=334094272';
    expect(withAffiliate('https://de.trip.com/hotels/detail/?hotelId=1&curr=EUR', tpl)).toBe(
      'https://de.trip.com/hotels/detail/?hotelId=1&curr=EUR&Allianceid=11087826&SID=334094272',
    );
    expect(withAffiliate('https://de.trip.com/hotels/list?SID=1', tpl)).toBe(
      'https://de.trip.com/hotels/list?SID=334094272&Allianceid=11087826',
    );
    expect(
      outboundUrl(provider('trip-com', false, tpl), { ...hotel, page: '12345' }, stay, 'de'),
    ).toContain(
      'hotelId=12345&checkIn=2026-12-04&checkOut=2026-12-06&adult=2&children=0&crn=1&curr=EUR&Allianceid=11087826&SID=334094272',
    );
  });
});

describe('safeHttpsUrl', () => {
  it('accepts plain https URLs only', () => {
    expect(safeHttpsUrl('https://example.com/a b')).toBe('https://example.com/a%20b');
    expect(safeHttpsUrl('not a url')).toBeNull();
    expect(safeHttpsUrl('')).toBeNull();
  });
});

describe('goPath', () => {
  it('carries provider, hotel, stay and language', () => {
    expect(goPath('booking-com', 'hotel-adlon-kempinski-berlin', stay, 'en')).toBe(
      '/go/booking-com/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06&adults=2&lang=en',
    );
  });
});
