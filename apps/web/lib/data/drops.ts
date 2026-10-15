import 'server-only';
import { cache } from 'react';
import { groupDrops, priceDropRowSchema, z, type HotelDrops } from '@tidaq/core';
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
