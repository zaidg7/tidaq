import { nights } from './dates';
import type { Locale } from './format';

/**
 * Outbound links (C-026). Our price source has no deep links, so a click opens the hotel's page on
 * the provider with these dates (where we know it, C-133), the provider's own search for this
 * hotel and these dates, or the hotel's official website. We only build links;
 * we never fetch these pages (hard rule 2). Every link goes through `/go/…` so clicks are counted
 * (no IP, no user agent) and affiliate parameters can be added later in one place.
 */

export interface OutboundStay {
  checkIn: string;
  checkOut: string;
  adults: number;
}

/** What the search on a provider's site is for: "Hotel Adlon Kempinski Berlin". */
export interface OutboundHotel {
  name: string;
  /** English city name, the one booking sites understand everywhere. */
  city: string;
  /** The hotel's own website, for the hotel-direct "provider". */
  officialUrl: string | null;
  /**
   * The hotel's own page on this provider (C-133, `hotel_provider_pages`): Agoda's page path
   * (`hotel-adlon-kempinski/hotel/berlin-de.html`) or Trip.com's hotel id. Searches by name don't
   * fill in hotel and dates there; the hotel page does.
   */
  page?: string | null;
}

type SearchUrl = (q: string, stay: OutboundStay, locale: Locale) => string;

const params = (p: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(p).map(([k, v]): [string, string] => [k, String(v)]),
  ).toString();

/** Provider slug (table `providers`) → its public hotel search with dates and guests. */
const SEARCH: Record<string, SearchUrl> = {
  'booking-com': (q, s, l) =>
    `https://www.booking.com/searchresults.${l === 'de' ? 'de' : 'en-gb'}.html?${params({
      ss: q,
      checkin: s.checkIn,
      checkout: s.checkOut,
      group_adults: s.adults,
      no_rooms: 1,
      group_children: 0,
    })}`,
  agoda: (q, s, l) =>
    `https://www.agoda.com/${l === 'de' ? 'de-de' : 'en-gb'}/search?${params({
      textToSearch: q,
      checkIn: s.checkIn,
      los: nights(s.checkIn, s.checkOut),
      adults: s.adults,
      rooms: 1,
      currency: 'EUR',
    })}`,
  'trip-com': (q, s, l) =>
    `https://${l === 'de' ? 'de' : 'uk'}.trip.com/hotels/list?${params({
      keyword: q,
      checkin: s.checkIn,
      checkout: s.checkOut,
      adult: s.adults,
      crn: 1,
      curr: 'EUR',
    })}`,
  'hotels-com': (q, s, l) =>
    `https://${l === 'de' ? 'de' : 'uk'}.hotels.com/Hotel-Search?${params({
      destination: q,
      startDate: s.checkIn,
      endDate: s.checkOut,
      adults: s.adults,
    })}`,
  expedia: (q, s, l) =>
    `https://www.expedia.${l === 'de' ? 'de' : 'co.uk'}/Hotel-Search?${params({
      destination: q,
      startDate: s.checkIn,
      endDate: s.checkOut,
      adults: s.adults,
    })}`,
};

type PageUrl = (page: string, stay: OutboundStay, locale: Locale) => string | null;

/** Provider slug → the hotel's own page with dates and guests filled in (C-133). */
const PAGE: Record<string, PageUrl> = {
  agoda: (page, s, l) =>
    /^[a-z0-9_-]+\/hotel\/[a-z0-9-]+\.html$/.test(page)
      ? `https://www.agoda.com/${l === 'de' ? 'de-de' : 'en-gb'}/${page}?${params({
          checkIn: s.checkIn,
          los: nights(s.checkIn, s.checkOut),
          adults: s.adults,
          rooms: 1,
          children: 0,
          currency: 'EUR',
        })}`
      : null,
  'trip-com': (page, s, l) =>
    /^\d+$/.test(page)
      ? `https://${l === 'de' ? 'de' : 'uk'}.trip.com/hotels/detail/?${params({
          hotelId: page,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          adult: s.adults,
          children: 0,
          crn: 1,
          curr: 'EUR',
        })}`
      : null,
};

/**
 * Sites whose search by name lands on an empty or wrong list (Zaid, 22 Oct: Trip.com showed no
 * hotel, he had to type it): we only link them when we know the hotel's own page (C-177).
 */
const PAGE_ONLY = new Set(['trip-com', 'agoda']);

/** Providers we can send visitors to (plus the hotel's own site when we know it). */
export function hasOutboundSearch(providerSlug: string): boolean {
  return Object.hasOwn(SEARCH, providerSlug);
}

/** Whether `/go` has a target for this site and hotel: a working search, or the hotel's page. */
export function canLinkOut(providerSlug: string, hasHotelPage: boolean): boolean {
  if (PAGE_ONLY.has(providerSlug)) return hasHotelPage && Object.hasOwn(PAGE, providerSlug);
  return hasOutboundSearch(providerSlug);
}

/** A safe absolute https URL, or null (no `javascript:`, no plain http, no credentials). */
export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Applies a provider's affiliate template (`providers.affiliate_template`). Two kinds:
 * - a wrapper, e.g. `https://partner.example/click?id=42&url={url}`: `{url}` becomes the encoded
 *   target;
 * - query parameters, e.g. `?Allianceid=11087826&SID=334094272` (Trip.com, C-050a): added to the
 *   target itself, replacing a parameter of the same name.
 * A template that isn't https, has no `{url}` or no parameters is ignored, so a typo never breaks
 * the link.
 */
export function withAffiliate(url: string, template: string | null | undefined): string {
  if (!template) return url;
  if (template.startsWith('?')) {
    const extra = new URLSearchParams(template.slice(1));
    const target = safeHttpsUrl(url);
    if (!target || [...extra.keys()].length === 0) return url;
    const out = new URL(target);
    for (const [k, v] of extra) out.searchParams.set(k, v);
    return out.toString();
  }
  if (!template.includes('{url}')) return url;
  return safeHttpsUrl(template.replaceAll('{url}', encodeURIComponent(url))) ?? url;
}

/** Where `/go/<provider>/<hotel>` sends the visitor, or null when we have no target. */
export function outboundUrl(
  provider: { slug: string; isDirect: boolean; affiliateTemplate: string | null },
  hotel: OutboundHotel,
  stay: OutboundStay,
  locale: Locale,
): string | null {
  let target: string | null;
  if (provider.isDirect) target = safeHttpsUrl(hotel.officialUrl);
  else {
    // The hotel's own page where we know it (dates filled in), else the provider's search.
    const page = hotel.page ? (PAGE[provider.slug]?.(hotel.page, stay, locale) ?? null) : null;
    const search = PAGE_ONLY.has(provider.slug) ? undefined : SEARCH[provider.slug];
    target = page ?? (search ? search(`${hotel.name} ${hotel.city}`, stay, locale) : null);
  }
  return target && withAffiliate(target, provider.affiliateTemplate);
}

/** `/go/booking-com/hotel-adlon-kempinski-berlin?in=…&out=…&adults=2&lang=de` */
export function goPath(
  providerSlug: string,
  hotelSlug: string,
  stay: OutboundStay,
  locale: Locale,
): string {
  return `/go/${providerSlug}/${hotelSlug}?${params({
    in: stay.checkIn,
    out: stay.checkOut,
    adults: stay.adults,
    lang: locale,
  })}`;
}
