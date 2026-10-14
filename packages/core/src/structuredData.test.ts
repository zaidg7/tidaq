import { describe, expect, it } from 'vitest';
import { hotelJsonLd, jsonLdString, siteJsonLd } from './structuredData';

describe('hotelJsonLd', () => {
  const base = {
    name: 'Hotel Adlon Kempinski',
    path: '/hotel/adlon-kempinski-berlin',
    description: 'Fünf-Sterne-Hotel in Berlin.',
    stars: 5,
    city: 'Berlin',
    country: 'DE',
  };

  it('describes the hotel with absolute URLs and no prices', () => {
    expect(hotelJsonLd({ ...base, imagePath: '/photos/adlon-960.webp' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: 'Hotel Adlon Kempinski',
      url: 'https://tidaq.com/hotel/adlon-kempinski-berlin',
      description: 'Fünf-Sterne-Hotel in Berlin.',
      image: 'https://tidaq.com/photos/adlon-960.webp',
      starRating: { '@type': 'Rating', ratingValue: 5 },
      address: { '@type': 'PostalAddress', addressLocality: 'Berlin', addressCountry: 'DE' },
    });
  });

  it('leaves the image out without a licensed photo', () => {
    expect(hotelJsonLd({ ...base, imagePath: null })).not.toHaveProperty('image');
  });
});

describe('jsonLdString', () => {
  it('escapes < so the script tag cannot be closed from inside', () => {
    const s = jsonLdString({ name: '</script><b>' });
    expect(s).not.toContain('<');
    expect(JSON.parse(s)).toEqual({ name: '</script><b>' });
  });
});

describe('siteJsonLd', () => {
  it('describes Tidaq as organization and website, linked by id', () => {
    const data = siteJsonLd('Preisverlauf für Luxushotels', 'de') as {
      '@graph': Record<string, unknown>[];
    };
    const [org, site] = data['@graph'];
    expect(org).toMatchObject({
      '@type': 'Organization',
      name: 'Tidaq',
      url: 'https://tidaq.com/',
    });
    expect(site).toMatchObject({
      '@type': 'WebSite',
      inLanguage: 'de',
      publisher: { '@id': org?.['@id'] },
    });
  });
});
