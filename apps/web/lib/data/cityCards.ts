import 'server-only';
import type { Locale } from '@tidaq/core';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';
import { hotelPhoto, type HotelPhoto } from '@/lib/hotelPhotos';
import { getCatalog } from './catalog';
import { getDrops } from './drops';

export interface CityCard {
  slug: string;
  name: string;
  /** ISO country code ('' when unknown), for regions on /staedte. */
  country: string;
  hotels: number;
  /** Hotels in the city with a Price Drop today. */
  drops: number;
  /** The city's photo, else one of its hotels' own photos; null only if neither exists. */
  photo: HotelPhoto | null;
  /** Alt text: the city photo's description, or the hotel's name. */
  alt: string;
}

/**
 * Where people from Germany book five-star city trips most (our order, not a ranking): ties in
 * "most drops today" fall back to it, so the homepage never shows a random city first.
 */
const POPULAR = [
  'paris',
  'london',
  'dubai',
  'malediven',
  'new-york',
  'rom',
  'barcelona',
  'wien',
  'mailand',
  'istanbul',
  'lissabon',
  'tokio',
  'singapur',
  'amsterdam',
  'muenchen',
  'berlin',
];

function rank(slug: string): number {
  const i = POPULAR.indexOf(slug);
  return i === -1 ? POPULAR.length : i;
}

/**
 * Every city we track as a card: hotel count from the catalog, today's drops from the radar.
 * `order: 'popular'` puts cities with today's drops first (then our popularity order), for the
 * homepage; `order: 'name'` sorts A–Z, for /staedte. Null without a catalog.
 */
export async function getCityCards(
  locale: Locale,
  today: string,
  order: 'popular' | 'name',
): Promise<CityCard[] | null> {
  const [catalog, drops] = await Promise.all([getCatalog(), getDrops(today)]);
  if (!catalog) return null;
  const byCity = new Map<string, CityCard>();
  for (const h of catalog.hotels) {
    const city = cityPhoto(h.city.slug);
    const card = byCity.get(h.city.slug) ?? {
      slug: h.city.slug,
      name: h.city.name[locale],
      country: h.city.country ?? '',
      hotels: 0,
      drops: 0,
      photo: city ? cityPhotoAsHotelPhoto(city) : null,
      alt: city?.alt ?? '',
    };
    card.hotels += 1;
    // No city photo (Hamburg): the first of its hotels with an own photo stands in.
    const own = card.photo ? null : hotelPhoto(h.slug);
    if (own) {
      card.photo = own;
      card.alt = h.name;
    }
    byCity.set(h.city.slug, card);
  }
  if (drops.kind === 'ok') {
    for (const g of drops.drops) {
      const card = byCity.get(g.city.slug);
      if (card) card.drops += 1;
    }
  }
  const cards = [...byCity.values()];
  return order === 'name'
    ? cards.sort((a, b) => a.name.localeCompare(b.name, locale))
    : cards.sort(
        (a, b) =>
          Number(!!b.photo) - Number(!!a.photo) ||
          Number(b.drops > 0) - Number(a.drops > 0) ||
          rank(a.slug) - rank(b.slug) ||
          a.name.localeCompare(b.name, locale),
      );
}
