import 'server-only';
import {
  addDays,
  platformSchema,
  POSTED,
  postedDropInsert,
  z,
  type HotelDrops,
  type Platform,
  type PriceDrop,
} from '@tidaq/core';
import { serviceRest } from './db';

/**
 * "Gepostet" in the creator kit (C-080j): which drops went into a TikTok or Instagram post. A
 * mark saves the drop as it is now (`posted_drops`), so the landing can show it after it left
 * the radar. Service role, only after `requireAdmin()`.
 */

const stay = (hotelId: number, d: Pick<PriceDrop, 'night' | 'checkOut'>) =>
  `hotel_id=eq.${hotelId}&night=eq.${d.night}&check_out=eq.${d.checkOut}`;

export async function markPosted(
  group: HotelDrops,
  drop: PriceDrop,
  platform: Platform,
  today: string,
) {
  await serviceRest('posted_drops?on_conflict=hotel_id,night,check_out,platform', null, {
    method: 'POST',
    body: postedDropInsert(group, drop, platform, today),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

export async function unmarkPosted(hotelId: number, drop: PriceDrop, platform: Platform) {
  await serviceRest(`posted_drops?${stay(hotelId, drop)}&platform=eq.${platform}`, null, {
    method: 'DELETE',
  });
}

const markRow = z.object({
  hotel_id: z.number().int(),
  night: z.string(),
  check_out: z.string(),
  platform: platformSchema,
});

/** Marks of the last week as `hotelId|night|checkOut` → platforms. Empty when the read fails. */
export async function postedMarks(today: string): Promise<Map<string, Platform[]>> {
  const marks = new Map<string, Platform[]>();
  try {
    const rows = await serviceRest(
      `posted_drops?select=hotel_id,night,check_out,platform&posted_on=gte.${addDays(today, -(POSTED.days - 1))}`,
      z.array(markRow),
    );
    for (const r of rows) {
      const k = markKey(r.hotel_id, { night: r.night, checkOut: r.check_out });
      marks.set(k, [...(marks.get(k) ?? []), r.platform]);
    }
  } catch (error) {
    console.error('[admin] posted marks unavailable', (error as Error).message);
  }
  return marks;
}

export const markKey = (hotelId: number, d: Pick<PriceDrop, 'night' | 'checkOut'>) =>
  `${hotelId}|${d.night}|${d.checkOut}`;
