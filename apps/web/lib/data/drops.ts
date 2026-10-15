import 'server-only';
import { cache } from 'react';
import {
  addDays,
  findDrop,
  hasOutboundSearch,
  parseDropKey,
  groupDrops,
  POSTED,
  postedDropRowSchema,
  postedDrops,
  type PostedDrop,
  priceDropRowSchema,
  z,
  type DailyPrice,
  type HotelDrops,
  type PriceDrop,
  weekSummary,
  type WeekSummary,
} from '@tidaq/core';
import { getCatalog, type CatalogHotel } from './catalog';
import { reportError } from '@/lib/errors';
import { hotelImage, type ImageRef } from '@/lib/photos';
import { isAffiliate } from './stay';
import { hasSupabase, rest, rpc } from './supabase';

/** `image.city`: the city's photo stands in for the hotel's own (shown as "Stadtbild", C-105). */
export type HotelDropsWithPhoto = HotelDrops & { image: ImageRef | null };

export type DropsLoad =
  | { kind: 'ok'; drops: HotelDropsWithPhoto[]; seenAt: string | null }
  /** No database (CI, local without env) or the read failed. */
  | { kind: 'unavailable' };

/**
 * Today's sudden price drops (C-080a; SQL `radar_drops`, which adds the usual price, C-080d), one entry per hotel with its photo.
 * Cached per request: the radar, the homepage teaser and city pages share one read.
 */
export const getDrops = cache(async (today: string): Promise<DropsLoad> => {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    // Single nights and Friday-to-Sunday weekends (C-080f).
    const [nights, weekends] = await Promise.all([
      rpc('radar_drops', { p_today: today }, z.array(priceDropRowSchema)),
      rpc('radar_weekend_drops', { p_today: today }, z.array(priceDropRowSchema)),
    ]);
    const rows = [...nights, ...weekends];
    const seenAt = rows.reduce<string | null>(
      (max, r) => (max === null || r.seen_at > max ? r.seen_at : max),
      null,
    );
    return {
      kind: 'ok',
      seenAt,
      drops: groupDrops(rows).map((g) => ({
        ...g,
        image: hotelImage(g.hotel.slug, g.city.slug, 960),
      })),
    };
  } catch (error) {
    reportError('drops unavailable', error);
    return { kind: 'unavailable' };
  }
});

const statsRow = z.object({
  day: z.string(),
  nights: z.number().int().nonnegative(),
  hotels: z.number().int().nonnegative(),
  cities: z.number().int().nonnegative(),
  sites: z.number().int().nonnegative(),
});
export type RadarStats = z.infer<typeof statsRow>;

/**
 * What the night grid checked on its latest day (C-080d, SQL `radar_stats`): the proof line on the
 * radar ("Heute geprüft: 5.722 Nächte in 82 Hotels"). Null without data or on a read error.
 */
export const getRadarStats = cache(async (today: string): Promise<RadarStats | null> => {
  if (!hasSupabase()) return null;
  try {
    const [row] = await rpc('radar_stats', { p_today: today }, z.array(statsRow));
    return row && row.nights > 0 ? row : null;
  } catch (error) {
    reportError('radar stats unavailable', error);
    return null;
  }
});

/** One day of `stay_history_from_nights` for the drop's stay (C-080b). */
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
      /** The drop's site, when we can send visitors there (C-080g); `partner` = affiliate link. */
      offer: { partner: boolean } | null;
      /** Credit for the hotel's own photo ("Toglenn, CC BY-SA 3.0"); null for city photos. */
      credit: { text: string; href: string | null } | null;
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
  // `key` is a `dropKey` (a string, so `cache` dedupes metadata and page): night or weekend.
  async (slug: string, key: string, today: string): Promise<DropPageLoad> => {
    const stay = parseDropKey(key);
    if (!stay) return { kind: 'missing' };
    const load = await getDrops(today);
    if (load.kind === 'unavailable') return { kind: 'unavailable' };
    const found = findDrop(load.drops, slug, stay);
    if (!found) {
      const hotel = (await getCatalog())?.hotels.find((h) => h.slug === slug);
      return hotel
        ? { kind: 'over', hotel, image: hotelImage(slug, hotel.city.slug, 960) }
        : { kind: 'missing' };
    }
    let series: DailyPrice[] = [];
    // The site's link (C-080g): only sites we can search; the hotel's own site needs its URL.
    const offerSlug = found.drop.provider.slug;
    const offerLoad = hasOutboundSearch(offerSlug)
      ? rest(
          `providers?select=affiliate_template&slug=eq.${encodeURIComponent(offerSlug)}`,
          z.object({ affiliate_template: z.string().nullable() }),
        ).catch((error: unknown) => {
          reportError('drop offer unavailable', error);
          return null;
        })
      : Promise.resolve(null);
    // The licence asks for the author's name next to the photo (C-011c).
    const creditLoad = found.group.image?.city
      ? Promise.resolve(null)
      : rest(
          `hotels?select=image_credit,image_source_url&slug=eq.${encodeURIComponent(slug)}`,
          z.object({
            image_credit: z.string().nullable(),
            image_source_url: z.string().nullable(),
          }),
        ).catch((error: unknown) => {
          reportError('drop photo credit unavailable', error);
          return null;
        });
    try {
      const rows = await rpc(
        'stay_history_from_nights',
        {
          p_hotel_id: found.group.hotel.id,
          p_check_in: stay.night,
          p_check_out: stay.checkOut,
          p_from_day: addDays(today, -(DROP_HISTORY_DAYS - 1)),
        },
        z.array(nightDay),
      );
      series = rows.map((r) => ({ day: r.day, bestCents: r.best_cents }));
    } catch (error) {
      // The drop itself is known; the page shows it without the chart.
      reportError('drop history unavailable', error);
    }
    const offerRow = (await offerLoad)?.[0];
    const creditRow = (await creditLoad)?.[0];
    return {
      kind: 'ok',
      ...found,
      offer: offerRow ? { partner: isAffiliate(offerRow.affiliate_template) } : null,
      credit: creditRow?.image_credit
        ? {
            // Stored as "Foto: Name, Lizenz, via Wikimedia Commons"; the page adds its own prefix.
            text: creditRow.image_credit
              .replace(/^(Foto|Photo):\s*/i, '')
              .replace(/,?\s*via Wikimedia Commons$/i, ''),
            href: creditRow.image_source_url,
          }
        : null,
      series,
      others: load.drops.filter((g) => g.hotel.slug !== slug),
    };
  },
);

/** Days in the weekly recap (C-080h). */
export const WEEK_DAYS = 7;

export type WeekLoad =
  | {
      kind: 'ok';
      /** One entry per hotel with its biggest drop of the week on top, biggest first. */
      groups: HotelDropsWithPhoto[];
      summary: WeekSummary;
      from: string;
      to: string;
    }
  | { kind: 'unavailable' };

/**
 * The week's drops (C-080h, SQL `radar_week`): the recap page and the creator kit's weekly set.
 * Recomputed from the night grid, about 150 ms in SQL.
 */
export const getWeek = cache(async (today: string): Promise<WeekLoad> => {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    const rows = await rpc(
      'radar_week',
      { p_today: today, p_days: WEEK_DAYS },
      z.array(priceDropRowSchema),
    );
    return {
      kind: 'ok',
      groups: groupDrops(rows).map((g) => ({
        ...g,
        image: hotelImage(g.hotel.slug, g.city.slug, 960),
      })),
      summary: weekSummary(rows),
      from: addDays(today, -(WEEK_DAYS - 1)),
      to: today,
    };
  } catch (error) {
    reportError('drop week unavailable', error);
    return { kind: 'unavailable' };
  }
});

/**
 * Drops we showed in our TikTok and Instagram posts during the last week (C-080j, SQL
 * `posted_drops_recent`), newest post first. An extra on the bio-link landing: empty when the
 * read fails, so the radar still renders.
 */
export const getPosted = cache(async (today: string): Promise<PostedDrop[]> => {
  if (!hasSupabase()) return [];
  try {
    const rows = await rpc(
      'posted_drops_recent',
      { p_today: today, p_days: POSTED.days },
      z.array(postedDropRowSchema),
    );
    return postedDrops(rows);
  } catch (error) {
    reportError('posted drops unavailable', error);
    return [];
  }
});
