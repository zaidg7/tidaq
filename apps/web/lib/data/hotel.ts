import 'server-only';
import { hotelPhoto, type PhotoSize } from '@/lib/hotelPhotos';
import { NIGHT_GRID, shiftDays, z, type NightPrice } from '@tidaq/core';
import { hasSupabase, rest, rpc } from './supabase';
import { reportError } from '@/lib/errors';

const hotelRow = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  active: z.boolean(),
  stars: z.number(),
  image_credit: z.string().nullable(),
  image_source_url: z.string().nullable(),
  cities: z.object({
    slug: z.string(),
    name_de: z.string(),
    name_en: z.string(),
    country_code: z.string(),
  }),
});

const dayRow = z.object({ day: z.string(), collected_at: z.string() });

const nightRow = z.object({
  night: z.string(),
  day: z.string(),
  best_cents: z.number().int().positive().nullable(),
  /** `{ "<provider id>": cents }`, every platform incl. pending ones. */
  per_provider: z.record(z.string(), z.number()),
});

const providerRow = z.object({ id: z.number(), name: z.string(), is_direct: z.boolean() });
const reliabilityRow = z.object({ hotel_id: z.number(), reliable: z.boolean() });

export interface HotelPage {
  hotel: {
    slug: string;
    name: string;
    active: boolean;
    stars: number;
    city: { slug: string; country: string; name: { de: string; en: string } };
    /** Self-hosted photo (C-011c) with its credit, when licensed. */
    image: (PhotoSize & { credit: string; sourceUrl: string | null }) | null;
  };
  /** Today's price of every night from today on (night grid, 2 adults), oldest first. */
  nights: NightPrice[];
  /** When those nights were last collected, null without nights. */
  updatedAt: string | null;
  /** Reviewed platforms: ids that count for totals, names for the summary. */
  providers: { id: number; name: string; isDirect: boolean }[];
  /** Single nights mislead at this hotel (C-070d): no totals from them. */
  nightsUnreliable: boolean;
}

export type HotelLoad =
  | { kind: 'ok'; data: HotelPage }
  | { kind: 'missing' }
  /** No Supabase (CI, local dev) or a read failed: the page explains and offers a retry. */
  | { kind: 'unavailable' };

/**
 * Everything the hotel page (C-023a) shows, read with the public anon key (RLS: reviewed
 * providers only). Each night's price is its newest from the latest two collection days: today's
 * run fills the nights from the nearest on (C-070a), so until it reaches the far ones they keep
 * yesterday's price.
 */
export async function getHotelPage(slug: string, today: string): Promise<HotelLoad> {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    const [hotel] = await rest(
      'hotels?select=id,slug,name,active,stars,image_credit,image_source_url,' +
        `cities(slug,name_de,name_en,country_code)&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      hotelRow,
    );
    if (!hotel) return { kind: 'missing' };

    const [latest, reliability] = await Promise.all([
      rest(
        `night_daily?select=day,collected_at&hotel_id=eq.${hotel.id}&adults=eq.${NIGHT_GRID.adults}` +
          '&order=day.desc,collected_at.desc&limit=1',
        dayRow,
      ),
      rpc(
        'night_reliability',
        { p_day: today, p_hotel_id: hotel.id },
        z.array(reliabilityRow),
      ).catch((error: unknown) => {
        reportError('night reliability failed', error, { slug });
        return [];
      }),
    ]);
    const day = latest[0]?.day ?? null;
    const last = shiftDays(today, NIGHT_GRID.windowDays);
    const both = day
      ? await rest(
          `night_daily?select=night,day,best_cents,per_provider&hotel_id=eq.${hotel.id}` +
            `&adults=eq.${NIGHT_GRID.adults}&day=gte.${shiftDays(day, -1)}` +
            `&night=gte.${today}&night=lt.${last}&order=night.asc,day.desc`,
          nightRow,
        )
      : [];
    // Ordered by night, newest day first: keep the first row of each night.
    const rows = both.filter((r, i) => i === 0 || both[i - 1]?.night !== r.night);

    const ids = [
      ...new Set(rows.flatMap((r) => Object.keys(r.per_provider)).filter((k) => /^\d+$/.test(k))),
    ];
    // RLS returns reviewed providers only: exactly the ones that count for totals.
    const providers = ids.length
      ? await rest(`providers?select=id,name,is_direct&id=in.(${ids.join(',')})`, providerRow)
      : [];

    const photo = hotelPhoto(hotel.slug);
    return {
      kind: 'ok',
      data: {
        hotel: {
          slug: hotel.slug,
          name: hotel.name,
          active: hotel.active,
          stars: hotel.stars,
          city: {
            slug: hotel.cities.slug,
            country: hotel.cities.country_code,
            name: { de: hotel.cities.name_de, en: hotel.cities.name_en },
          },
          image:
            photo && hotel.image_credit
              ? { ...photo[960], credit: hotel.image_credit, sourceUrl: hotel.image_source_url }
              : null,
        },
        nights: rows.map((r) => ({
          night: r.night,
          bestCents: r.best_cents,
          perProvider: r.per_provider,
        })),
        updatedAt: rows.length ? (latest[0]?.collected_at ?? null) : null,
        providers: providers.map((p) => ({ id: p.id, name: p.name, isDirect: p.is_direct })),
        nightsUnreliable: reliability.some((r) => !r.reliable),
      },
    };
  } catch (error) {
    reportError('hotel unavailable', error, { slug });
    return { kind: 'unavailable' };
  }
}
