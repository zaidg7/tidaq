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
