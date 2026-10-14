import { nights } from './dates';
import type { Locale } from './format';

/**
 * Outbound links (C-026). Our price source has no deep links, so a click opens the provider's own
 * search for this hotel and these dates, or the hotel's official website. We only build links;
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

/** Providers we can send visitors to (plus the hotel's own site when we know it). */
export function hasOutboundSearch(providerSlug: string): boolean {
  return Object.hasOwn(SEARCH, providerSlug);
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
 * Applies a provider's affiliate template (`providers.affiliate_template`, e.g.
 * `https://partner.example/click?id=42&url={url}`): `{url}` becomes the encoded target. A template
 * that isn't https or has no `{url}` is ignored, so a typo never breaks the link.
 */
export function withAffiliate(url: string, template: string | null | undefined): string {
  if (!template || !template.includes('{url}')) return url;
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
    const search = SEARCH[provider.slug];
    target = search ? search(`${hotel.name} ${hotel.city}`, stay, locale) : null;
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
