import 'server-only';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { cityImage, type ImageRef } from '@/lib/photos';
import { addDays, z } from '@tidaq/core';
import { hasSupabase, rest, rpc } from './supabase';
import { reportError } from '@/lib/errors';

const cityRow = z.object({
  id: z.number(),
  slug: z.string(),
  name_de: z.string(),
  name_en: z.string(),
  country_code: z.string(),
});

const hotelRow = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  image_credit: z.string().nullable(),
});

const weekendRow = z.object({
  hotel_id: z.number(),
  check_in: z.string().nullable(),
  total_cents: z.number().int().positive().nullable(),
  provider_id: z.number().nullable(),
});

const providerRow = z.object({ id: z.number(), name: z.string(), is_direct: z.boolean() });
const reliabilityRow = z.object({ hotel_id: z.number(), reliable: z.boolean() });

const directoryRow = z.object({
  slug: z.string(),
  name: z.string(),
  cities: z.object({
    slug: z.string(),
    name_de: z.string(),
    name_en: z.string(),
    country_code: z.string(),
  }),
});

export interface City {
  slug: string;
  country: string;
  name: { de: string; en: string };
}

export interface CityHotel {
  slug: string;
  name: string;
  /** Self-hosted 960 px photo (C-011c), when licensed; else the city's photo (`city: true`, C-105). */
  image: ImageRef | null;
  /**
   * Cheapest upcoming Fri → Sun stay on one reviewed site (SQL `city_best_weekends`), or null:
   * no prices yet, or single nights mislead at this hotel (C-070d).
   */
  weekend: { checkIn: string; checkOut: string; totalCents: number; provider: string } | null;
}

export type CityLoad =
  { kind: 'ok'; city: City; hotels: CityHotel[] } | { kind: 'missing' } | { kind: 'unavailable' };

/** City page (C-024): the city and its active hotels, A–Z, each with its cheapest weekend. */
export async function getCityPage(slug: string, today: string): Promise<CityLoad> {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    const [city] = await rest(
      `cities?select=id,slug,name_de,name_en,country_code&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      cityRow,
    );
    if (!city) return { kind: 'missing' };
    const [hotels, weekends, reliability] = await Promise.all([
      rest(
        `hotels?select=id,slug,name,image_credit&city_id=eq.${city.id}&active=eq.true&order=name`,
        hotelRow,
      ),
      rpc('city_best_weekends', { p_city: slug, p_today: today }, z.array(weekendRow)),
      rpc('night_reliability', { p_day: today }, z.array(reliabilityRow)).catch(
        (error: unknown) => {
          reportError('night reliability failed', error, { slug });
          // Unknown reliability: show no totals from nights rather than possibly wrong ones.
          return null;
        },
      ),
    ]);
    const unreliable = new Set(reliability?.filter((r) => !r.reliable).map((r) => r.hotel_id));
    const providerIds = [
      ...new Set(weekends.map((w) => w.provider_id).filter((id): id is number => id !== null)),
    ];
    const providers = providerIds.length
      ? await rest(
          `providers?select=id,name,is_direct&id=in.(${providerIds.join(',')})`,
          providerRow,
        )
      : [];
    const providerById = new Map(providers.map((p) => [p.id, p]));
    const weekendByHotel = new Map(weekends.map((w) => [w.hotel_id, w]));

    return {
      kind: 'ok',
      city: {
        slug: city.slug,
        country: city.country_code,
        name: { de: city.name_de, en: city.name_en },
      },
      hotels: hotels.map((h) => {
        const w = weekendByHotel.get(h.id);
        const p = w?.provider_id != null ? providerById.get(w.provider_id) : undefined;
        const photo = hotelPhoto(h.slug);
        return {
          slug: h.slug,
          name: h.name,
          image: photo && h.image_credit ? photo[960] : cityImage(city.slug),
          weekend:
            w?.check_in && w.total_cents && p && reliability && !unreliable.has(h.id)
              ? {
                  checkIn: w.check_in,
                  checkOut: addDays(w.check_in, 2),
                  totalCents: w.total_cents,
                  provider: p.is_direct ? h.name : p.name,
                }
              : null,
        };
      }),
    };
  } catch (error) {
    reportError('city unavailable', error, { slug });
    return { kind: 'unavailable' };
  }
}

export interface DirectoryCity extends City {
  hotels: { slug: string; name: string }[];
}

/** `/hotels` (C-024): every active hotel, grouped by city. Null without Supabase or on error. */
export async function getHotelDirectory(): Promise<DirectoryCity[] | null> {
  if (!hasSupabase()) return null;
  try {
    const rows = await rest(
      'hotels?select=slug,name,cities(slug,name_de,name_en,country_code)&active=eq.true&order=name',
      directoryRow,
    );
    const bySlug = new Map<string, DirectoryCity>();
    for (const r of rows) {
      const c =
        bySlug.get(r.cities.slug) ??
        bySlug
          .set(r.cities.slug, {
            slug: r.cities.slug,
            country: r.cities.country_code,
            name: { de: r.cities.name_de, en: r.cities.name_en },
            hotels: [],
          })
          .get(r.cities.slug);
      c?.hotels.push({ slug: r.slug, name: r.name });
    }
    return [...bySlug.values()];
  } catch (error) {
    reportError('directory unavailable', error);
    return null;
  }
}
