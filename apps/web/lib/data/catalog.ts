import 'server-only';
import { z } from '@tidaq/core';
import { hasSupabase, rest } from './supabase';
import { reportError } from '@/lib/errors';

const hotelRow = z.object({
  slug: z.string(),
  name: z.string(),
  cities: z.object({
    slug: z.string(),
    name_de: z.string(),
    name_en: z.string(),
    country_code: z.string(),
  }),
});

export interface CatalogHotel {
  slug: string;
  name: string;
  /** `country`: ISO code, for regions (optional: the search samples have none). */
  city: { slug: string; name: { de: string; en: string }; country?: string };
}

export interface Catalog {
  hotels: CatalogHotel[];
  cityCount: number;
}

/**
 * Active hotels with their city, for the search card and the real numbers in the hero
 * ("36 Hotels · 12 Städte"). Null without Supabase or on a read error: callers drop the numbers.
 */
export async function getCatalog(): Promise<Catalog | null> {
  if (!hasSupabase()) return null;
  try {
    const rows = await rest(
      'hotels?select=slug,name,cities(slug,name_de,name_en,country_code)&active=eq.true&order=name',
      hotelRow,
    );
    const hotels = rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      city: {
        slug: r.cities.slug,
        name: { de: r.cities.name_de, en: r.cities.name_en },
        country: r.cities.country_code,
      },
    }));
    return { hotels, cityCount: new Set(hotels.map((h) => h.city.slug)).size };
  } catch (error) {
    reportError('catalog unavailable', error);
    return null;
  }
}
