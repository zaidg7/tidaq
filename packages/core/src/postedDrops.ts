import { z } from 'zod';
import { findDrop, groupDrops, priceDropRowSchema, type HotelDrops, type PriceDrop } from './drops';

/**
 * "Aus unseren Videos" (C-080j): drops we showed in a TikTok or Instagram post. The creator kit
 * stores a snapshot of the drop as posted (SQL `posted_drops`), because the radar is recomputed
 * every day and a drop from a video can be gone by the time someone taps the bio link. The
 * landing lists these first and says honestly whether each one is still on the radar.
 */
export const POSTED = {
  /** Posts from the last this many days. */
  days: 7,
  /** At most this many on the landing. */
  max: 6,
} as const;

export const PLATFORMS = ['tiktok', 'instagram'] as const;
export type Platform = (typeof PLATFORMS)[number];
export const platformSchema = z.enum(PLATFORMS);

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** A row of SQL `posted_drops_recent`. */
export const postedDropRowSchema = priceDropRowSchema.extend({
  check_out: day,
  posted_on: day,
  platforms: z.array(platformSchema).min(1),
});
export type PostedDropRow = z.infer<typeof postedDropRowSchema>;

export interface PostedDrop {
  /** The hotel with the drop as posted in `top` (no other nights). */
  group: HotelDrops;
  /** Berlin day of the (latest) post. */
  postedOn: string;
  platforms: Platform[];
}

/** Rows in the order SQL returns them (newest post first), at most `POSTED.max`. */
export function postedDrops(rows: readonly PostedDropRow[]): PostedDrop[] {
  const out: PostedDrop[] = [];
  for (const r of rows.slice(0, POSTED.max)) {
    const [group] = groupDrops([r]);
    if (group) out.push({ group, postedOn: r.posted_on, platforms: [...r.platforms] });
  }
  return out;
}

/**
 * Still on today's radar? Then the current drop (its prices can differ from the post when the
 * stay fell again); otherwise the drop is over and the page shows the price as of now.
 */
export function postedStatus(
  posted: PostedDrop,
  today: readonly HotelDrops[],
): { live: true; drop: PriceDrop } | { live: false } {
  const hit = findDrop(today, posted.group.hotel.slug, posted.group.top);
  return hit ? { live: true, drop: hit.drop } : { live: false };
}

/** The `posted_drops` row the creator kit saves for a drop it posted. */
export function postedDropInsert(
  group: Pick<HotelDrops, 'hotel'>,
  drop: PriceDrop,
  platform: Platform,
  postedOn: string,
) {
  return {
    hotel_id: group.hotel.id,
    night: drop.night,
    check_out: drop.checkOut,
    platform,
    posted_on: postedOn,
    seen_day: drop.seenDay,
    seen_at: drop.seenAt,
    now_cents: drop.nowCents,
    prev_cents: drop.prevCents,
    drop_pct: drop.drop,
    prior_low_cents: drop.priorLowCents,
    prior_days: drop.priorDays,
    prior_avg_cents: drop.priorAvgCents,
    provider_slug: drop.provider.slug,
    offers: drop.offers,
    confirmed: drop.confirmed,
  };
}
