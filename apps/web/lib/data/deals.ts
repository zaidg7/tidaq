import 'server-only';
import { DEALS, pickDeals, z } from '@tidaq/core';
import { berlinToday } from '@/lib/today';
import { hasSupabase, rest } from './supabase';
import { hotelPhoto } from '@/lib/hotelPhotos';

const dealRow = z.object({
  stay_id: z.number(),
  hotel_id: z.number(),
  hotel_slug: z.string(),
  hotel_name: z.string(),
  city_slug: z.string(),
  city_name_de: z.string(),
  city_name_en: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  adults: z.number(),
  days_tracked: z.number().nullable(),
  now_cents: z.number().nullable(),
  avg30_cents: z.number().nullable(),
});

export interface Deal {
  stayId: number;
  hotelSlug: string;
  hotelName: string;
  citySlug: string;
  cityName: { de: string; en: string };
  checkIn: string;
  checkOut: string;
  adults: number;
  nowCents: number;
  /** Relative to the 30-day average, e.g. −0.14. */
  drop: number;
  imageUrl: string | null;
}

/**
 * The biggest drops for the homepage (C-020b2, 3) and `/deals` (C-025, all): upcoming stays at least 8 % under their
 * 30-day average with 14+ days of history (`pickDeals` in core). Empty until the data allows it,
 * null without Supabase or on a read error. Callers hide the section when there is nothing.
 */
export async function getDeals(limit = 3): Promise<Deal[] | null> {
  if (!hasSupabase()) return null;
  try {
    const rows = await rest(
      'v_stay_public?select=stay_id,hotel_id,hotel_slug,hotel_name,city_slug,city_name_de,city_name_en,' +
        'check_in,check_out,adults,days_tracked,now_cents,avg30_cents' +
        `&active=eq.true&check_in=gte.${berlinToday()}&days_tracked=gte.${DEALS.minDays}` +
        '&now_cents=not.is.null&avg30_cents=not.is.null&limit=1000',
      dealRow,
    );
    return pickDeals(
      rows.map((r) => ({
        ...r,
        stayId: r.stay_id,
        hotelSlug: r.hotel_slug,
        nowCents: r.now_cents,
        avg30Cents: r.avg30_cents,
        daysTracked: r.days_tracked,
      })),
      limit,
    ).map((d) => ({
      stayId: d.stay_id,
      hotelSlug: d.hotel_slug,
      hotelName: d.hotel_name,
      citySlug: d.city_slug,
      cityName: { de: d.city_name_de, en: d.city_name_en },
      checkIn: d.check_in,
      checkOut: d.check_out,
      adults: d.adults,
      nowCents: d.now_cents as number,
      drop: d.drop,
      imageUrl: hotelPhoto(d.hotel_slug)?.[960].src ?? null,
    }));
  } catch (error) {
    console.error('deals unavailable', { error: String(error) });
    return null;
  }
}
