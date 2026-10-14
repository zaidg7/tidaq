/**
 * schema.org structured data (JSON-LD) for search engines (C-023b). Facts only: no prices or
 * offers, because a night price changes daily and Google would show a stale one.
 */

/** Public site origin for absolute URLs in structured data. */
export const SITE_ORIGIN = 'https://tidaq.com';

export interface HotelJsonLdInput {
  name: string;
  /** Path of the hotel page, e.g. `/en/hotel/adlon-kempinski-berlin`. */
  path: string;
  description: string;
  stars: number;
  city: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** Site-relative photo path, when licensed. */
  imagePath: string | null;
}

export function hotelJsonLd(h: HotelJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: h.name,
    url: `${SITE_ORIGIN}${h.path}`,
    description: h.description,
    ...(h.imagePath ? { image: `${SITE_ORIGIN}${h.imagePath}` } : {}),
    starRating: { '@type': 'Rating', ratingValue: h.stars },
    address: { '@type': 'PostalAddress', addressLocality: h.city, addressCountry: h.country },
  };
}

/**
 * JSON for a `<script type="application/ld+json">`: `<` is escaped so a name like
 * `</script>` can't end the script early.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * The site itself for the homepage (C-028a): Organization (name, logo) and WebSite, as one
 * `@graph`. No search action: our search needs dates, which schema.org's SearchAction can't
 * express.
 */
export function siteJsonLd(description: string, language: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'Tidaq',
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/icon.svg`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: 'Tidaq',
        url: `${SITE_ORIGIN}/`,
        description,
        inLanguage: language,
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
}
