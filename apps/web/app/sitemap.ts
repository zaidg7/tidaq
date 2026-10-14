import type { MetadataRoute } from 'next';
import {
  alternatesFor,
  cityPath,
  hasProviderPage,
  hotelPath,
  providerPath,
  SITE_ORIGIN,
} from '@tidaq/core';
import { getHotelDirectory } from '@/lib/data/city';
import { getProviderFacts } from '@/lib/data/providers';
import { routes } from '@/lib/routes';

// The catalog lives in the database: build the list per request (cheap, one query).
export const dynamic = 'force-dynamic';

/** Pages without data, always listed. Stay pages are endless (any dates) and stay out. */
const STATIC = [
  routes.home,
  routes.hotels,
  routes.deals,
  routes.method,
  routes.ranking,
  routes.affiliate,
  routes.imprint,
  routes.privacy,
];

/**
 * `/sitemap.xml` (C-028a): every page in both languages with its hreflang alternates. City and
 * hotel pages come from the catalog, provider pages from `provider_facts` (C-034); without a
 * database only the static pages are listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [directory, facts] = await Promise.all([getHotelDirectory(), getProviderFacts()]);
  const cities = directory ?? [];
  const providers = facts.kind === 'ok' ? facts.facts.providers.filter(hasProviderPage) : [];
  const paths = [
    ...STATIC,
    ...cities.map((c) => cityPath(c.slug)),
    ...cities.flatMap((c) => c.hotels.map((h) => hotelPath(h.slug))),
    ...providers.map((p) => providerPath(p.slug)),
  ];
  return paths.flatMap((path) =>
    (['de', 'en'] as const).map((locale) => {
      const alt = alternatesFor(path, locale);
      return {
        url: `${SITE_ORIGIN}${alt.canonical}`,
        alternates: {
          languages: Object.fromEntries(
            Object.entries(alt.languages).map(([k, v]) => [k, `${SITE_ORIGIN}${v}`]),
          ),
        },
      };
    }),
  );
}
