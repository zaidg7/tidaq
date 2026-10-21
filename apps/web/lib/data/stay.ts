import 'server-only';
import { hotelPhoto, type PhotoSize } from '@/lib/hotelPhotos';
import {
  addDays,
  hasOutboundSearch,
  inNightGrid,
  nightSumGap,
  safeHttpsUrl,
  STATS,
  withAffiliate,
  z,
  type DailyPrice,
  type StayOffer,
  type StayParams,
} from '@tidaq/core';
import { hasSupabase, rest, rpc } from './supabase';
import { reportError } from '@/lib/errors';
import { taxesFor } from './priceFactors';

const hotelRow = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  active: z.boolean(),
  image_credit: z.string().nullable(),
  image_source_url: z.string().nullable(),
  official_url: z.string().nullable(),
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

/** One day of `stay_history_from_nights` (C-070b): the stay built from its single nights. */
const nightDayRow = z.object({
  day: z.string(),
  best_cents: z.number().int().positive(),
  best_provider_id: z.number().nullable(),
  per_provider: z.record(z.string(), z.number()),
});

const collectedRow = z.object({ collected_at: z.string() });

/** `night_reliability` for one hotel (C-070d); no row = not enough comparisons = reliable. */
const reliabilityRow = z.object({ hotel_id: z.number(), reliable: z.boolean() });

const scoreRow = z.object({
  provider_id: z.number(),
  score: z.number(),
  tests: z.number(),
  matches: z.number(),
  avg_markup_pct: z.number().nullable(),
});

const providerRow = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  is_direct: z.boolean(),
  affiliate_template: z.string().nullable(),
});

/** True when the template really changes links (a broken one is ignored by `withAffiliate`). */
export const isAffiliate = (template: string | null) =>
  withAffiliate('https://example.com/', template) !== 'https://example.com/';

export interface StayHotel {
  slug: string;
  name: string;
  active: boolean;
  city: { slug: string; name: { de: string; en: string } };
  /** Self-hosted thumbnail (C-011c) with its credit, when licensed. */
  image: (PhotoSize & { credit: string; sourceUrl: string | null }) | null;
}

export interface StayData {
  hotel: StayHotel;
  /** Null when we don't track these exact dates and guests. */
  stay: { active: boolean; updatedAt: string | null } | null;
  /**
   * Where the chart's history comes from (C-070b, D-42): `nights` = summed single nights (any
   * dates inside the night grid), `stay` = real checks of this exact stay, null = no prices yet.
   */
  history: 'nights' | 'stay' | null;
  /** The dates are inside the night grid (2 adults, next 120 days), so prices will come. */
  inNightGrid: boolean;
  /**
   * The dates are inside the night grid, but for this hotel single nights don't add up to the
   * real stay price (C-070d): only real checks of the exact stay are shown.
   */
  nightsUnreliable: boolean;
  /** When the shown history was last collected (stay stats or the nights' collection time). */
  updatedAt: string | null;
  /**
   * Today's real price for these exact dates differs by more than 3 % from the sum of the
   * nights the chart shows: both, for an honest note. Null otherwise.
   */
  realVsNights: { realCents: number; nightsCents: number } | null;
  /** Best reviewed price per day, oldest first, at most the stats window. */
  series: DailyPrice[];
  /** Name of the cheapest provider per day, for the chart readout and table. */
  providerByDay: Record<string, string>;
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
      'hotels?select=id,slug,name,active,image_credit,image_source_url,official_url,' +
        'cities(slug,name_de,name_en)' +
        `&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      hotelRow,
    );
    if (!hotel) return { kind: 'missing' };

    const gridDates = hotel.active && inNightGrid(p, today);
    const [stays, reliability] = await Promise.all([
      rest(
        `tracked_stays?select=id,active,stay_stats(updated_at)&hotel_id=eq.${hotel.id}` +
          `&check_in=eq.${p.checkIn}&check_out=eq.${p.checkOut}&adults=eq.${p.adults}&limit=1`,
        stayRow,
      ),
      gridDates
        ? rpc(
            'night_reliability',
            { p_day: today, p_hotel_id: hotel.id },
            z.array(reliabilityRow),
          ).catch((error: unknown) => {
            // Without the answer, show the night history as before C-070d.
            reportError('night reliability failed', error, { slug });
            return [];
          })
        : Promise.resolve([]),
    ]);
    const stay = stays[0] ?? null;
    const nightsUnreliable = gridDates && reliability.some((r) => !r.reliable);
    const nightsOn = gridDates && !nightsUnreliable;

    const from = addDays(today, -(STATS.windowDays - 1));
    const [days, nightDays, collected] = await Promise.all([
      stay
        ? rest(
            `stay_daily?select=day,best_cents,best_provider_id,per_provider&stay_id=eq.${stay.id}` +
              `&best_provider_id=not.is.null&day=gte.${from}&day=lte.${today}&order=day.asc`,
            dailyRow,
          )
        : Promise.resolve([]),
      nightsOn
        ? rpc(
            'stay_history_from_nights',
            {
              p_hotel_id: hotel.id,
              p_check_in: p.checkIn,
              p_check_out: p.checkOut,
              p_from_day: from,
            },
            z.array(nightDayRow),
          )
        : Promise.resolve([]),
      nightsOn
        ? rest(
            `night_daily?select=collected_at&hotel_id=eq.${hotel.id}&night=gte.${p.checkIn}` +
              `&night=lt.${p.checkOut}&order=collected_at.desc&limit=1`,
            collectedRow,
          )
        : Promise.resolve([]),
    ]);

    // The longer history wins: real checks of this exact stay early on, the nights once they
    // reach back further (they cover every date from the first collected day).
    const nightDaysClean = nightDays.filter((d) => d.day <= today);
    const history: StayData['history'] =
      nightDaysClean.length > 0 && nightDaysClean.length >= days.length
        ? 'nights'
        : days.length > 0
          ? 'stay'
          : null;
    const rows = history === 'nights' ? nightDaysClean : days;

    // Today's provider table: the real check of these dates when it ran today, else the rows.
    const realToday = days.at(-1)?.day === today ? days.at(-1) : undefined;
    const nightsToday = nightDaysClean.at(-1)?.day === today ? nightDaysClean.at(-1) : undefined;
    const latest = realToday ?? rows.at(-1);
    const gap = nightSumGap(realToday?.best_cents ?? null, nightsToday?.best_cents ?? null);
    const realVsNights =
      history === 'nights' && gap !== null && realToday && nightsToday
        ? { realCents: realToday.best_cents, nightsCents: nightsToday.best_cents }
        : null;

    const latestIds = Object.keys(latest?.per_provider ?? {}).filter((id) => /^\d+$/.test(id));
    const providerIds = [
      ...new Set([
        ...rows.map((d) => d.best_provider_id).filter((id) => id !== null),
        ...latestIds.map(Number),
      ]),
    ];
    // RLS returns reviewed providers only; scores are public (provider_scores).
    const [providers, scores] = providerIds.length
      ? await Promise.all([
          rest(
            'providers?select=id,slug,name,is_direct,affiliate_template' +
              `&id=in.(${providerIds.join(',')})`,
            providerRow,
          ),
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
    for (const d of rows) {
      const pr = d.best_provider_id === null ? undefined : nameById.get(d.best_provider_id);
      if (pr) providerByDay[d.day] = pr.is_direct ? hotel.name : pr.name;
    }

    // Base rates plus the hotel's taxes and fees (C-157).
    const tax = await taxesFor(hotel.id);
    const offers: StayOffer[] = [];
    for (const id of latestIds) {
      const pr = nameById.get(Number(id));
      const cents = latest?.per_provider[id];
      if (!pr || cents === undefined || !Number.isInteger(cents) || cents <= 0) continue;
      const sc = scoreById.get(pr.id);
      offers.push({
        providerId: pr.id,
        slug: pr.slug,
        name: pr.name,
        isDirect: pr.is_direct,
        totalCents: tax(cents),
        // The /go route builds the same target (core `outboundUrl`); no button without one.
        ...((pr.is_direct ? safeHttpsUrl(hotel.official_url) : hasOutboundSearch(pr.slug)) && {
          link: { slug: pr.slug, partner: isAffiliate(pr.affiliate_template) },
        }),
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
        history,
        inNightGrid: nightsOn,
        nightsUnreliable,
        updatedAt:
          history === 'nights'
            ? (collected[0]?.collected_at ?? null)
            : (stay?.stay_stats?.updated_at ?? null),
        realVsNights: realVsNights && {
          realCents: tax(realVsNights.realCents),
          nightsCents: tax(realVsNights.nightsCents),
        },
        series: rows.map((d) => ({ day: d.day, bestCents: tax(d.best_cents) })),
        providerByDay,
        offers: {
          day: latest?.day ?? null,
          list: offers,
          unreviewed: latestIds.filter((id) => !nameById.has(Number(id))).length,
        },
      },
    };
  } catch (error) {
    reportError('stay unavailable', error, { slug });
    return { kind: 'unavailable' };
  }
}
