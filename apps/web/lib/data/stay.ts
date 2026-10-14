import 'server-only';
import { hotelPhoto, type PhotoSize } from '@/lib/hotelPhotos';
import {
  addDays,
  STATS,
  stayStates,
  z,
  type DailyPrice,
  type StayOffer,
  type StayParams,
} from '@tidaq/core';
import { hasSupabase, rest } from './supabase';

const hotelRow = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  active: z.boolean(),
  image_credit: z.string().nullable(),
  image_source_url: z.string().nullable(),
  cities: z.object({ slug: z.string(), name_de: z.string(), name_en: z.string() }),
});

const stayRow = z.object({
  id: z.number(),
  active: z.boolean(),
  stay_stats: z.object({ updated_at: z.string() }).nullable(),
});

const dailyRow = z.object({
  day: z.string(),
  best_cents: z.number().int().positive(),
  best_provider_id: z.number().nullable(),
  /** `{ "<provider id>": total cents }`, every provider including unreviewed ones. */
  per_provider: z.record(z.string(), z.number()),
});

const scoreRow = z.object({
  provider_id: z.number(),
  score: z.number(),
  tests: z.number(),
  matches: z.number(),
  avg_markup_pct: z.number().nullable(),
});

const providerRow = z.object({ id: z.number(), name: z.string(), is_direct: z.boolean() });

const calendarRow = z.object({
  check_in: z.string(),
  check_out: z.string(),
  adults: z.number(),
  best_cents: z.number().nullable(),
  state: z.enum(stayStates).nullable(),
});

export interface StayHotel {
  slug: string;
  name: string;
  active: boolean;
  city: { slug: string; name: { de: string; en: string } };
  /** Self-hosted thumbnail (C-011c) with its credit, when licensed. */
  image: (PhotoSize & { credit: string; sourceUrl: string | null }) | null;
}

/** Another tracked stay of the same hotel ("Weitere Termine"). */
export interface OtherStay {
  checkIn: string;
  checkOut: string;
  adults: number;
  bestCents: number | null;
  state: (typeof stayStates)[number] | null;
}

export interface StayData {
  hotel: StayHotel;
  /** Null when we don't track these exact dates and guests. */
  stay: { active: boolean; updatedAt: string | null } | null;
  /** Best reviewed price per day, oldest first, at most the stats window. */
  series: DailyPrice[];
  /** Name of the cheapest provider per day, for the chart readout and table. */
  providerByDay: Record<string, string>;
  /** Up to 6 upcoming tracked stays of this hotel, soonest first, without this one. */
  others: OtherStay[];
  /**
   * The latest day's price per reviewed provider with its checkout-test record (C-022b).
   * `unreviewed`: providers with a price that aren't reviewed yet (RLS hides their names).
   */
  offers: { day: string | null; list: StayOffer[]; unreviewed: number };
}

export type StayLoad =
  | { kind: 'ok'; data: StayData }
  /** No hotel with this slug. */
  | { kind: 'missing' }
  /** No Supabase (CI, local dev) or a read failed: the page explains and offers a retry. */
  | { kind: 'unavailable' };

/**
 * Everything the stay page (C-022) shows, read with the public anon key (RLS: reviewed
 * providers only). `today` is the Berlin date; the series covers the 60-day stats window.
 */
export async function getStay(slug: string, p: StayParams, today: string): Promise<StayLoad> {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    const [hotel] = await rest(
      `hotels?select=id,slug,name,active,image_credit,image_source_url,cities(slug,name_de,name_en)` +
        `&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      hotelRow,
    );
    if (!hotel) return { kind: 'missing' };

    const [stays, calendar] = await Promise.all([
      rest(
        `tracked_stays?select=id,active,stay_stats(updated_at)&hotel_id=eq.${hotel.id}` +
          `&check_in=eq.${p.checkIn}&check_out=eq.${p.checkOut}&adults=eq.${p.adults}&limit=1`,
        stayRow,
      ),
      hotel.active
        ? rest(
            `v_hotel_calendar?select=check_in,check_out,adults,best_cents,state` +
              `&hotel_id=eq.${hotel.id}&check_in=gte.${today}&order=check_in.asc,check_out.asc` +
              '&limit=7',
            calendarRow,
          )
        : Promise.resolve([]),
    ]);
    const stay = stays[0] ?? null;

    const from = addDays(today, -(STATS.windowDays - 1));
    const days = stay
      ? await rest(
          `stay_daily?select=day,best_cents,best_provider_id,per_provider&stay_id=eq.${stay.id}` +
            `&best_provider_id=not.is.null&day=gte.${from}&day=lte.${today}&order=day.asc`,
          dailyRow,
        )
      : [];

    const latest = days.at(-1);
    const latestIds = Object.keys(latest?.per_provider ?? {}).filter((id) => /^\d+$/.test(id));
    const providerIds = [
      ...new Set([
        ...days.map((d) => d.best_provider_id).filter((id) => id !== null),
        ...latestIds.map(Number),
      ]),
    ];
    // RLS returns reviewed providers only; scores are public (provider_scores).
    const [providers, scores] = providerIds.length
      ? await Promise.all([
          rest(`providers?select=id,name,is_direct&id=in.(${providerIds.join(',')})`, providerRow),
          rest(
            'provider_scores?select=provider_id,score,tests,matches,avg_markup_pct' +
              `&provider_id=in.(${providerIds.join(',')})`,
            scoreRow,
          ),
        ])
      : [[], []];
    const scoreById = new Map(scores.map((sc) => [sc.provider_id, sc]));
    const nameById = new Map(providers.map((pr) => [pr.id, pr]));
    const providerByDay: Record<string, string> = {};
    for (const d of days) {
      const pr = d.best_provider_id === null ? undefined : nameById.get(d.best_provider_id);
      if (pr) providerByDay[d.day] = pr.is_direct ? hotel.name : pr.name;
    }

    const offers: StayOffer[] = [];
    for (const id of latestIds) {
      const pr = nameById.get(Number(id));
      const cents = latest?.per_provider[id];
      if (!pr || cents === undefined || !Number.isInteger(cents) || cents <= 0) continue;
      const sc = scoreById.get(pr.id);
      offers.push({
        providerId: pr.id,
        name: pr.name,
        isDirect: pr.is_direct,
        totalCents: cents,
        trust: sc
          ? {
              score: sc.score,
              tests: sc.tests,
              matches: sc.matches,
              avgMarkupPct: sc.avg_markup_pct,
            }
          : null,
      });
    }

    const photo = hotelPhoto(hotel.slug);
    return {
      kind: 'ok',
      data: {
        hotel: {
          slug: hotel.slug,
          name: hotel.name,
          active: hotel.active,
          city: {
            slug: hotel.cities.slug,
            name: { de: hotel.cities.name_de, en: hotel.cities.name_en },
          },
          image:
            photo && hotel.image_credit
              ? {
                  ...photo[160],
                  credit: hotel.image_credit,
                  sourceUrl: hotel.image_source_url,
                }
              : null,
        },
        stay: stay ? { active: stay.active, updatedAt: stay.stay_stats?.updated_at ?? null } : null,
        series: days.map((d) => ({ day: d.day, bestCents: d.best_cents })),
        providerByDay,
        offers: {
          day: latest?.day ?? null,
          list: offers,
          unreviewed: latestIds.filter((id) => !nameById.has(Number(id))).length,
        },
        others: calendar
          .filter(
            (c) =>
              !(c.check_in === p.checkIn && c.check_out === p.checkOut && c.adults === p.adults),
          )
          .slice(0, 6)
          .map((c) => ({
            checkIn: c.check_in,
            checkOut: c.check_out,
            adults: c.adults,
            bestCents: c.best_cents,
            state: c.state,
          })),
      },
    };
  } catch (error) {
    console.error(JSON.stringify({ msg: 'stay unavailable', slug, error: String(error) }));
    return { kind: 'unavailable' };
  }
}
