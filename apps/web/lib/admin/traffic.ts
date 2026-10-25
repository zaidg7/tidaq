import 'server-only';
import { z } from '@tidaq/core';
import { serviceRest } from './db';

/**
 * Visits and partner clicks of the last days (C-180), from SQL `traffic_stats`: per day, per
 * source (bio link), per booking site, per hotel and per posted video. Service role, only after
 * `requireAdmin()`. Every count is anonymous (no IP, no user agent, no id).
 */

const n = z.coerce.number().int();

export const trafficSchema = z.object({
  days: z.array(
    z.object({
      day: z.string(),
      views: n,
      radar: n,
      drop_pages: n,
      stays: n,
      hotels: n,
      clicks: n,
    }),
  ),
  providers: z.array(z.object({ provider: z.string().nullable(), clicks: n })),
  refs: z.array(z.object({ ref: z.string(), visits: n, clicks: n })),
  hotels: z.array(
    z.object({ slug: z.string().nullable(), name: z.string().nullable(), clicks: n, views: n }),
  ),
  posted: z.array(
    z.object({
      posted_on: z.string(),
      platform: z.string(),
      slug: z.string(),
      name: z.string(),
      drop_pct: z.coerce.number(),
      views_3d: n,
      clicks_3d: n,
    }),
  ),
});
export type Traffic = z.infer<typeof trafficSchema>;

export type TrafficLoad = { kind: 'ok'; data: Traffic } | { kind: 'missing' } | { kind: 'error' };

export async function getTraffic(days = 14): Promise<TrafficLoad> {
  try {
    const data = await serviceRest('rpc/traffic_stats', trafficSchema, {
      method: 'POST',
      body: { p_days: days },
      prefer: 'return=representation',
    });
    return { kind: 'ok', data };
  } catch (error) {
    // 404 until the C-180 migration is applied.
    return String(error).includes('Supabase 404') ? { kind: 'missing' } : { kind: 'error' };
  }
}

/** Visits and clicks of the last `days` entries (newest first), with the click rate. */
export function totals(t: Traffic, days: number) {
  const recent = t.days.slice(0, days);
  const visits = recent.reduce((s, d) => s + d.views, 0);
  const clicks = recent.reduce((s, d) => s + d.clicks, 0);
  return { visits, clicks, rate: visits > 0 ? clicks / visits : null };
}
