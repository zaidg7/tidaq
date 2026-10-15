import 'server-only';
import { cache } from 'react';
import {
  addDays,
  findDrop,
  groupDrops,
  priceDropRowSchema,
  z,
  type DailyPrice,
  type HotelDrops,
  type PriceDrop,
} from '@tidaq/core';
import { getCatalog, type CatalogHotel } from './catalog';
import { reportError } from '@/lib/errors';
import { hotelPhoto, type PhotoSize } from '@/lib/hotelPhotos';
import { hasSupabase, rpc } from './supabase';

export type HotelDropsWithPhoto = HotelDrops & { image: PhotoSize | null };

export type DropsLoad =
  | { kind: 'ok'; drops: HotelDropsWithPhoto[]; seenAt: string | null }
  /** No database (CI, local without env) or the read failed. */
  | { kind: 'unavailable' };

/**
 * Today's sudden price drops (C-080a, SQL `price_drops`), one entry per hotel with its photo.
 * Cached per request: the radar, the homepage teaser and city pages share one read.
 */
export const getDrops = cache(async (today: string): Promise<DropsLoad> => {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    const rows = await rpc('price_drops', { p_today: today }, z.array(priceDropRowSchema));
    const seenAt = rows.reduce<string | null>(
      (max, r) => (max === null || r.seen_at > max ? r.seen_at : max),
      null,
    );
    return {
      kind: 'ok',
      seenAt,
      drops: groupDrops(rows).map((g) => ({
        ...g,
        image: hotelPhoto(g.hotel.slug)?.[960] ?? null,
      })),
    };
  } catch (error) {
    reportError('drops unavailable', error);
    return { kind: 'unavailable' };
  }
});

/** One day of `stay_history_from_nights` for a single night (C-080b). */
const nightDay = z.object({ day: z.string(), best_cents: z.number().int().positive() });

/** Days of history on a drop page's chart. */
export const DROP_HISTORY_DAYS = 30;

export type DropPageLoad =
  | {
      kind: 'ok';
      group: HotelDropsWithPhoto;
      drop: PriceDrop;
      /** The night's cheapest reviewed price per check day (may be empty if that read failed). */
      series: DailyPrice[];
      /** Other hotels on today's radar, biggest drop first. */
      others: HotelDropsWithPhoto[];
    }
  /** Not (or no longer) on the radar: the price rose again, or the night has passed. */
  | { kind: 'over'; hotel: CatalogHotel; image: HotelDropsWithPhoto['image'] }
  | { kind: 'missing' }
  | { kind: 'unavailable' };

/**
 * A shareable drop page (C-080b, `/preissturz/[hotel]/[night]`): the drop from today's radar plus
 * the night's price history from the night grid. Links shared yesterday keep working: once the
 * drop is gone the page says so and points to the current price.
 */
export const getDropPage = cache(
  async (slug: string, night: string, today: string): Promise<DropPageLoad> => {
    const load = await getDrops(today);
    if (load.kind === 'unavailable') return { kind: 'unavailable' };
    const found = findDrop(load.drops, slug, night);
    if (!found) {
      const hotel = (await getCatalog())?.hotels.find((h) => h.slug === slug);
      return hotel
        ? { kind: 'over', hotel, image: hotelPhoto(slug)?.[960] ?? null }
        : { kind: 'missing' };
    }
    let series: DailyPrice[] = [];
    try {
      const rows = await rpc(
        'stay_history_from_nights',
        {
          p_hotel_id: found.group.hotel.id,
          p_check_in: night,
          p_check_out: addDays(night, 1),
          p_from_day: addDays(today, -(DROP_HISTORY_DAYS - 1)),
        },
        z.array(nightDay),
      );
      series = rows.map((r) => ({ day: r.day, bestCents: r.best_cents }));
    } catch (error) {
      // The drop itself is known; the page shows it without the chart.
      reportError('drop history unavailable', error);
    }
    return {
      kind: 'ok',
      ...found,
      series,
      others: load.drops.filter((g) => g.hotel.slug !== slug),
    };
  },
);
