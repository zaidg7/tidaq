import 'server-only';
import { hotelPhoto } from '@/lib/hotelPhotos';
import {
  addDays,
  computeStayStats,
  pickFeaturedStay,
  STATS,
  stayStates,
  toIsoDate,
  z,
  type DailyPrice,
  type StayStatsResult,
} from '@tidaq/core';
import { hasSupabase, rest } from './supabase';

const stayRow = z.object({
  stay_id: z.number(),
  hotel_id: z.number(),
  hotel_slug: z.string(),
  hotel_name: z.string(),
  city_slug: z.string(),
  city_name_de: z.string(),
  city_name_en: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  nights: z.number(),
  adults: z.number(),
  days_tracked: z.number().nullable(),
  now_cents: z.number().nullable(),
  state: z.enum(stayStates).nullable(),
  updated_at: z.string().nullable(),
});

const hotelImageRow = z.object({
  id: z.number(),
  image_credit: z.string().nullable(),
  image_source_url: z.string().nullable(),
});

const dailyRow = z.object({
  day: z.string(),
  best_cents: z.number().int().positive(),
  per_provider: z.record(z.string(), z.number()),
});

const providerRow = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  is_direct: z.boolean(),
});

export interface FeaturedOffer {
  providerSlug: string;
  providerName: string;
  isDirect: boolean;
  totalCents: number;
}

export interface FeaturedStay {
  stayId: number;
  hotel: {
    slug: string;
    name: string;
    citySlug: string;
    cityName: { de: string; en: string };
    /** Self-hosted thumbnail (C-011c) with the photo credit. */
    image: { url: string; credit: string; sourceUrl: string | null } | null;
  };
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  /** Best reviewed price per day, oldest first (STATS.windowDays at most). */
  series: DailyPrice[];
  stats: StayStatsResult;
  /** Reviewed providers on the latest day, cheapest first. */
  offers: FeaturedOffer[];
  /** When the stats were last computed (the morning collect run). */
  updatedAt: string | null;
}

/**
 * The homepage "live example" (C-020b): a real tracked stay with its price history and
 * providers. Null without Supabase (CI, local dev), without data, or on any read error;
 * the homepage then shows its labelled static example.
 */
export async function getFeaturedStay(now = new Date()): Promise<FeaturedStay | null> {
  if (!hasSupabase()) return null;
  const today = toIsoDate(now.getTime());
  try {
    const [stays, images] = await Promise.all([
      rest(
        'v_stay_public?select=stay_id,hotel_id,hotel_slug,hotel_name,city_slug,city_name_de,' +
          'city_name_en,check_in,check_out,nights,adults,days_tracked,now_cents,state,updated_at' +
          `&active=eq.true&check_in=gte.${today}&now_cents=not.is.null` +
          '&order=days_tracked.desc.nullslast&limit=500',
        stayRow,
      ),
      rest('hotels?select=id,image_credit,image_source_url&active=eq.true', hotelImageRow),
    ]);
    const imageByHotel = new Map(images.map((h) => [h.id, h]));
    const picked = pickFeaturedStay(
      stays.map((s) => ({
        ...s,
        stayId: s.stay_id,
        checkIn: s.check_in,
        daysTracked: s.days_tracked,
        nowCents: s.now_cents,
        hasImage: !!hotelPhoto(s.hotel_slug) && !!imageByHotel.get(s.hotel_id)?.image_credit,
      })),
      today,
    );
    if (!picked) return null;

    const from = addDays(today, -(STATS.windowDays - 1));
    const days = await rest(
      `stay_daily?select=day,best_cents,per_provider&stay_id=eq.${picked.stay_id}` +
        `&best_provider_id=not.is.null&day=gte.${from}&order=day.asc`,
      dailyRow,
    );
    const latest = days.at(-1);
    if (!latest) return null;

    const ids = Object.keys(latest.per_provider).filter((id) => /^\d+$/.test(id));
    // RLS returns reviewed providers only, so pending resellers drop out here.
    const providers = ids.length
      ? await rest(`providers?select=id,slug,name,is_direct&id=in.(${ids.join(',')})`, providerRow)
      : [];
    const offers = providers
      .map((p) => ({
        providerSlug: p.slug,
        providerName: p.name,
        isDirect: p.is_direct,
        totalCents: latest.per_provider[String(p.id)] as number,
      }))
      .filter((o) => Number.isInteger(o.totalCents) && o.totalCents > 0)
      .sort((a, b) => a.totalCents - b.totalCents);

    const series = days.map((d) => ({ day: d.day, bestCents: d.best_cents }));
    const image = imageByHotel.get(picked.hotel_id);
    const photo = hotelPhoto(picked.hotel_slug);
    return {
      stayId: picked.stay_id,
      hotel: {
        slug: picked.hotel_slug,
        name: picked.hotel_name,
        citySlug: picked.city_slug,
        cityName: { de: picked.city_name_de, en: picked.city_name_en },
        image:
          photo && image?.image_credit
            ? {
                url: photo[160].src,
                credit: image.image_credit,
                sourceUrl: image.image_source_url,
              }
            : null,
      },
      checkIn: picked.check_in,
      checkOut: picked.check_out,
      nights: picked.nights,
      adults: picked.adults,
      series,
      // Recomputed from the reviewed series: stay_stats can lag a day behind (C-019).
      stats: computeStayStats(series, today, picked.check_in),
      offers,
      updatedAt: picked.updated_at,
    };
  } catch (err) {
    console.error(JSON.stringify({ msg: 'featured stay unavailable', error: String(err) }));
    return null;
  }
}
