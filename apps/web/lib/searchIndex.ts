import 'server-only';
import { cityPath, localizedPath, type Locale } from '@tidaq/core';
import type { SearchCity, SearchDestHotel, SearchIndex } from '@/components/search/types';
import { cityPhoto } from './cityPhotos';
import type { CatalogHotel } from './data/catalog';
import type { HotelDropsWithPhoto } from './data/drops';
import { hotelPhoto } from './hotelPhotos';

export const POPULAR_CITIES = 8;
export const CHEAP_HOTELS = 3;

/**
 * Everything the search bar's destination panel shows (C-107, PREMIUM.md §9.1): hotels and
 * cities in the page language with thumbnails, the most popular cities and today's cheapest
 * hotels. `drops` is today's radar (empty when it can't load: the panel then skips the section).
 */
export function searchIndex(
  catalog: readonly CatalogHotel[],
  drops: readonly HotelDropsWithPhoto[],
  locale: Locale,
): SearchIndex {
  const dropBy = new Map(drops.map((d) => [d.hotel.slug, d.top.drop]));
  const hotels: SearchDestHotel[] = catalog.map((h) => {
    const drop = dropBy.get(h.slug);
    return {
      slug: h.slug,
      name: h.name,
      city: h.city.name[locale],
      citySlug: h.city.slug,
      thumb: hotelPhoto(h.slug)?.[160] ?? null,
      ...(drop !== undefined && { drop }),
    };
  });

  const bySlug = new Map<string, SearchCity>();
  for (const h of catalog) {
    const city = bySlug.get(h.city.slug);
    if (city) {
      city.hotels += 1;
      continue;
    }
    bySlug.set(h.city.slug, {
      slug: h.city.slug,
      name: h.city.name[locale],
      href: localizedPath(cityPath(h.city.slug), locale),
      thumb: cityPhoto(h.city.slug)?.[160] ?? null,
      hotels: 1,
    });
  }
  const cities = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const popular = [...cities]
    .sort((a, b) => b.hotels - a.hotels || a.name.localeCompare(b.name, 'de'))
    .slice(0, POPULAR_CITIES)
    .map((c) => c.slug);
  const cheap = [...drops]
    .filter((d) => catalog.some((h) => h.slug === d.hotel.slug))
    .sort((a, b) => b.top.drop - a.top.drop)
    .slice(0, CHEAP_HOTELS)
    .map((d) => d.hotel.slug);

  return { cities, hotels, popular, cheap };
}
