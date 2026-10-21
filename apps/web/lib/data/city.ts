import 'server-only';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { cityImage, type ImageRef } from '@/lib/photos';
import { NIGHT_GRID, shiftDays, stayFromNights, withTaxes, z, type NightPrice } from '@tidaq/core';
import { hasSupabase, rest, rpc } from './supabase';
import { reportError } from '@/lib/errors';
import { getPriceFactors } from './priceFactors';

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

const providerRow = z.object({ id: z.number(), name: z.string(), is_direct: z.boolean() });
const dayRow = z.object({ day: z.string() });
const nightRow = z.object({
  hotel_id: z.number(),
  night: z.string(),
  day: z.string(),
  best_cents: z.number().int().nullable(),
  per_provider: z.record(z.string(), z.number()),
});
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
   * With dates (C-110): the stay's total on one reviewed site, from today's night prices; null
   * when a night has no price yet, it's beyond the grid, or single nights mislead here.
   */
  stay?: { totalCents: number; provider: string } | null;
}

/** Dates on the city page: the hotels get their total for these, cheapest first. */
export interface CityDates {
  checkIn: string;
  checkOut: string;
}

export type CityLoad =
  { kind: 'ok'; city: City; hotels: CityHotel[] } | { kind: 'missing' } | { kind: 'unavailable' };

/**
 * City page (C-024): the city and its active hotels, A–Z. With
 * `dates` (C-110) each hotel also gets that stay's total, and the list is sorted by it.
 */
export async function getCityPage(
  slug: string,
  today: string,
  dates?: CityDates,
): Promise<CityLoad> {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    const [city] = await rest(
      `cities?select=id,slug,name_de,name_en,country_code&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      cityRow,
    );
    if (!city) return { kind: 'missing' };
    const [hotels, reliability] = await Promise.all([
      rest(
        `hotels?select=id,slug,name,image_credit&city_id=eq.${city.id}&active=eq.true&order=name`,
        hotelRow,
      ),
      rpc('night_reliability', { p_day: today }, z.array(reliabilityRow)).catch(
        (error: unknown) => {
          reportError('night reliability failed', error, { slug });
          // Unknown reliability: show no totals from nights rather than possibly wrong ones.
          return null;
        },
      ),
    ]);
    const unreliable = new Set(reliability?.filter((r) => !r.reliable).map((r) => r.hotel_id));
    const [stays, factors] = await Promise.all([
      dates ? cityStays(hotels, dates) : Promise.resolve(null),
      getPriceFactors(),
    ]);
    // Base rates plus each hotel's taxes and fees (C-157).
    const tax = (hotelId: number, cents: number) => withTaxes(cents, factors.get(hotelId));

    return {
      kind: 'ok',
      city: {
        slug: city.slug,
        country: city.country_code,
        name: { de: city.name_de, en: city.name_en },
      },
      hotels: hotels.map((h) => {
        const photo = hotelPhoto(h.slug);
        return {
          slug: h.slug,
          name: h.name,
          image: photo && h.image_credit ? photo[960] : cityImage(city.slug),
          ...(stays && {
            stay: (() => {
              const s = reliability && !unreliable.has(h.id) ? stays.get(h.id) : undefined;
              return s ? { ...s, totalCents: tax(h.id, s.totalCents) } : null;
            })(),
          }),
        };
      }),
    };
  } catch (error) {
    reportError('city unavailable', error, { slug });
    return { kind: 'unavailable' };
  }
}

/**
 * Each hotel's total for check-in → check-out from the night grid (C-070a), on one reviewed site
 * like the stay page's nights: each night's newest price from the latest two collection days.
 */
async function cityStays(
  hotels: readonly { id: number; name: string }[],
  { checkIn, checkOut }: CityDates,
): Promise<Map<number, { totalCents: number; provider: string }>> {
  const out = new Map<number, { totalCents: number; provider: string }>();
  if (!hotels.length) return out;
  const ids = hotels.map((h) => h.id).join(',');
  const [latest] = await rest(
    `night_daily?select=day&hotel_id=in.(${ids})&adults=eq.${NIGHT_GRID.adults}&order=day.desc&limit=1`,
    dayRow,
  );
  if (!latest) return out;
  const rows = await rest(
    `night_daily?select=hotel_id,night,day,best_cents,per_provider&hotel_id=in.(${ids})` +
      `&adults=eq.${NIGHT_GRID.adults}&day=gte.${shiftDays(latest.day, -1)}` +
      `&night=gte.${checkIn}&night=lt.${checkOut}&order=hotel_id.asc,night.asc,day.desc`,
    nightRow,
  );
  const nights = new Map<number, NightPrice[]>();
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (prev && prev.hotel_id === r.hotel_id && prev.night === r.night) return; // older day
    const list = nights.get(r.hotel_id) ?? [];
    list.push({ night: r.night, bestCents: r.best_cents, perProvider: r.per_provider });
    nights.set(r.hotel_id, list);
  });
  const providerIds = [
    ...new Set(rows.flatMap((r) => Object.keys(r.per_provider)).filter((k) => /^\d+$/.test(k))),
  ];
  // RLS returns reviewed providers only: exactly the ones that count for totals.
  const providers = providerIds.length
    ? await rest(`providers?select=id,name,is_direct&id=in.(${providerIds.join(',')})`, providerRow)
    : [];
  const reviewed = new Set(providers.map((p) => p.id));
  const byId = new Map(providers.map((p) => [p.id, p]));
  for (const h of hotels) {
    const stay = stayFromNights(nights.get(h.id) ?? [], checkIn, checkOut, reviewed);
    const p = stay.kind === 'ok' ? byId.get(stay.providerId) : undefined;
    if (stay.kind === 'ok' && p) {
      out.set(h.id, { totalCents: stay.totalCents, provider: p.is_direct ? h.name : p.name });
    }
  }
  return out;
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
