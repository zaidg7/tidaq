import { z } from 'zod';
import { addDays, daysBetween } from './dates';
import { formatPercent, formatWeekdayDayMonth, type Locale } from './format';
import { isoDateSchema } from './zod';

/**
 * Sudden price drops (C-080a, Preissturz-Radar): stays whose cheapest reviewed price fell sharply
 * since the previous day's check and reached a new low. Since C-125 the site shows trips only,
 * 5 or 7 nights in a row (SQL `radar_trip_drops`): a cheaper single night is no reason to travel.
 * This file groups them per hotel and filters them for the radar, the homepage and city pages.
 * Facts only (CLAUDE.md rule 8): both prices, the day seen, the site; no countdowns, no "only today".
 */
export const DROPS = {
  /** At least this much below the previous day's price (SQL `price_drops` uses the same). */
  minDrop: 0.15,
  /** And at least this many cents less. */
  minCents: 5000,
  /** Other trips listed under a hotel's biggest drop. */
  moreNights: 3,
  /** Trip lengths on the radar (C-125, SQL `refresh_trip_drops`), the "Dauer" filter. */
  tripLengths: [5, 7],
  /** Longest stay a drop link may name (`parseDropKey`). */
  maxNights: 14,
  /** "Sonst um X €" only when the average rests on at least this many earlier checks. */
  usualMinDays: 3,
} as const;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cents = z.number().int().positive();

export const priceDropRowSchema = z.object({
  hotel_id: z.number().int(),
  hotel_slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  hotel_name: z.string().min(1),
  city_slug: z.string(),
  city_name_de: z.string(),
  city_name_en: z.string(),
  night: day,
  /** Trips and weekends (C-125, C-080f); single nights leave it out. */
  check_out: day.optional(),
  seen_day: day,
  seen_at: z.string(),
  now_cents: cents,
  prev_cents: cents,
  drop_pct: z.coerce.number().positive().max(1),
  prior_low_cents: cents,
  prior_days: z.number().int().nonnegative(),
  /** Average of those earlier checks (C-080d, SQL `radar_drops`). */
  prior_avg_cents: cents,
  provider_slug: z.string(),
  provider_name: z.string(),
  provider_direct: z.boolean(),
  offers: z.number().int().nonnegative(),
  confirmed: z.boolean(),
  /**
   * The exact quote (C-148, D-52): the site's nightly price incl. taxes and fees as Google Hotels
   * shows it, its link and when we asked. `now_cents` is then the quoted stay total.
   */
  quote_nightly_cents: cents.nullish(),
  quote_url: z.string().nullish(),
  quoted_at: z.string().nullish(),
  /**
   * C-159 (D-53): true when the amounts are an exact quote; false when they are the live-checked
   * price plus the hotel's measured taxes and fees (C-157). Missing: exact when quoted.
   */
  exact: z.boolean().nullish(),
});
export type PriceDropRow = z.infer<typeof priceDropRowSchema>;

export interface PriceDrop {
  /** Check-in. */
  night: string;
  /** Check-out: the next day for a single night, else check-in plus `nights`. */
  checkOut: string;
  /** 5 or 7 for a trip (C-125); 1 or 2 in older rows. Prices are totals for these nights. */
  nights: number;
  /** Day of the check that saw the drop (Berlin). */
  seenDay: string;
  seenAt: string;
  nowCents: number;
  prevCents: number;
  /** Positive share, 0.36 = 36 % less than the day before. */
  drop: number;
  savedCents: number;
  /** Days this night was checked before; "lowest in N days" when ≥ 2. */
  priorDays: number;
  /** Average cheapest price over those earlier checks. */
  priorAvgCents: number;
  /** Lowest of those earlier checks (today's price is below it: a new low). */
  priorLowCents: number;
  provider: { slug: string; name: string; direct: boolean };
  /** Reviewed sites with a price for this night. */
  offers: number;
  /** A second reviewed site was within 10 % of the price. */
  confirmed: boolean;
  /**
   * Nightly price as the site shows it, taxes and fees included (exact quote, D-52). `nowCents`
   * is nightly × nights. Amounts measured on base rates (`prevCents`, `savedCents`, the prior
   * ones) are for sorting and the percentage only, never shown (C-148b).
   */
  nightlyCents: number;
  /** The price is an exact quote (C-148); else the checked price plus measured taxes (C-159). */
  exact: boolean;
}

export interface HotelDrops {
  hotel: { id: number; slug: string; name: string };
  city: { slug: string; name: { de: string; en: string } };
  /** The hotel's biggest drop. */
  top: PriceDrop;
  /** Its other dropped trips, by date (all of them; pages show `DROPS.moreNights`). */
  more: PriceDrop[];
}

function toDrop(r: PriceDropRow): PriceDrop {
  const checkOut = r.check_out ?? addDays(r.night, 1);
  return {
    night: r.night,
    checkOut,
    nights: daysBetween(r.night, checkOut),
    seenDay: r.seen_day,
    seenAt: r.seen_at,
    nowCents: r.now_cents,
    prevCents: r.prev_cents,
    drop: r.drop_pct,
    savedCents: r.prev_cents - r.now_cents,
    priorDays: r.prior_days,
    priorAvgCents: r.prior_avg_cents,
    priorLowCents: r.prior_low_cents,
    provider: { slug: r.provider_slug, name: r.provider_name, direct: r.provider_direct },
    offers: r.offers,
    confirmed: r.confirmed,
    nightlyCents:
      r.quote_nightly_cents ??
      Math.round(r.now_cents / Math.max(1, daysBetween(r.night, checkOut))),
    exact: r.exact ?? Boolean(r.quoted_at),
  };
}

/**
 * One entry per hotel: its biggest drop on top (ties: the earlier night), the other nights by
 * date; hotels by their top drop, biggest first (ties: more money saved, then name).
 */
export function groupDrops(rows: readonly PriceDropRow[]): HotelDrops[] {
  const byHotel = new Map<number, PriceDropRow[]>();
  for (const r of rows) byHotel.set(r.hotel_id, [...(byHotel.get(r.hotel_id) ?? []), r]);
  const groups: HotelDrops[] = [];
  for (const list of byHotel.values()) {
    const drops = list.map(toDrop).sort((a, b) => b.drop - a.drop || byDate(a, b));
    const [top, ...rest] = drops;
    const first = list[0];
    if (!top || !first) continue;
    groups.push({
      hotel: { id: first.hotel_id, slug: first.hotel_slug, name: first.hotel_name },
      city: { slug: first.city_slug, name: { de: first.city_name_de, en: first.city_name_en } },
      top,
      more: rest.sort(byDate),
    });
  }
  return groups.sort(byDrop);
}

/** By check-in, the shorter stay first. */
const byDate = (a: PriceDrop, b: PriceDrop) =>
  a.night.localeCompare(b.night) || a.nights - b.nights;

const byDrop = (a: HotelDrops, b: HotelDrops) =>
  b.top.drop - a.top.drop ||
  b.top.savedCents - a.top.savedCents ||
  a.hotel.name.localeCompare(b.hotel.name);

export type DropSort = 'pct' | 'eur' | 'soon';
export const DROP_SORTS: readonly DropSort[] = ['pct', 'eur', 'soon'];

/** The month a trip starts in, `2026-11`: the "Wann" filter (C-125). */
export function dropMonth(night: string): string {
  return night.slice(0, 7);
}

/** Every month with a trip on the radar, earliest first: the month chips. */
export function dropMonths(groups: readonly HotelDrops[]): string[] {
  const months = new Set<string>();
  for (const g of groups) for (const d of [g.top, ...g.more]) months.add(dropMonth(d.night));
  return [...months].sort();
}

/**
 * Filters the hotels by city, start month (`2026-11`) and trip length. With a month or length
 * filter a hotel stays when any of its trips matches, and that trip becomes its top entry.
 */
export function filterDrops<T extends HotelDrops>(
  groups: readonly T[],
  f: { city?: string | null; month?: string | null; nights?: number | null },
): T[] {
  const out: T[] = [];
  for (const g of groups) {
    if (f.city && g.city.slug !== f.city) continue;
    if (!f.month && !f.nights) {
      out.push(g);
      continue;
    }
    const all = [g.top, ...g.more].filter(
      (d) => (!f.month || dropMonth(d.night) === f.month) && (!f.nights || d.nights === f.nights),
    );
    const [top, ...rest] = all.sort((a, b) => b.drop - a.drop || byDate(a, b));
    if (top) out.push({ ...g, top, more: rest.sort(byDate) });
  }
  return out.sort(byDrop);
}

/**
 * Up to `max` of a hotel's other trips that don't overlap `top` or each other (C-125): trips
 * starting a day apart are nearly the same holiday, so a card offers different dates instead.
 * Bigger drops win; the result is by date.
 */
export function distinctTrips(
  top: PriceDrop,
  more: readonly PriceDrop[],
  max: number,
): PriceDrop[] {
  const picked: PriceDrop[] = [];
  const taken = [top];
  for (const d of [...more].sort((a, b) => b.drop - a.drop || byDate(a, b))) {
    if (picked.length >= max) break;
    if (taken.some((t) => d.night < t.checkOut && t.night < d.checkOut)) continue;
    picked.push(d);
    taken.push(d);
  }
  return picked.sort(byDate);
}

/** A hotel's earliest dropped night (`more` is by date). */
const soonest = (g: HotelDrops) => {
  const first = g.more[0]?.night;
  return first !== undefined && first < g.top.night ? first : g.top.night;
};

/** Biggest drop first (default), most money saved first, or the soonest night first. */
export function sortDrops<T extends HotelDrops>(groups: readonly T[], sort: DropSort): T[] {
  const copy = [...groups];
  if (sort === 'eur')
    return copy.sort((a, b) => b.top.savedCents - a.top.savedCents || byDrop(a, b));
  if (sort === 'soon')
    return copy.sort((a, b) => soonest(a).localeCompare(soonest(b)) || byDrop(a, b));
  return copy.sort(byDrop);
}

/**
 * The radar's hero (C-080d2): the biggest drop that rests on real history (at least
 * `DROPS.usualMinDays` earlier checks), so the first thing a visitor sees isn't a drop measured
 * against a single earlier price. Without such a drop, simply the biggest. `groups` biggest first.
 */
export function heroDrop<T extends HotelDrops>(groups: readonly T[]): T | null {
  return groups.find((g) => g.top.priorDays >= DROPS.usualMinDays) ?? groups[0] ?? null;
}

/** Headline numbers for the radar: cheaper trips, hotels, cities, the biggest drop. */
export function dropStats(groups: readonly HotelDrops[]) {
  return {
    trips: groups.reduce((n, g) => n + 1 + g.more.length, 0),
    hotels: groups.length,
    cities: new Set(groups.map((g) => g.city.slug)).size,
    biggest: groups.reduce((m, g) => Math.max(m, g.top.drop), 0),
  };
}

/**
 * The usual price of that night (C-080d): the average of the earlier checks, shown as the anchor
 * ("sonst um 5.200 €") only when enough checks back it up and it's above today's price.
 */
export function usualCents(d: PriceDrop): number | null {
  return d.priorDays >= DROPS.usualMinDays && d.priorAvgCents > d.nowCents ? d.priorAvgCents : null;
}

/** A drop as text with the typographic minus: `−28 %` (DE), `−28%` (EN). */
export function formatDrop(drop: number, locale: Locale): string {
  return formatPercent(-drop, locale, { signed: true }).replace('-', '−');
}

/**
 * How a drop looks (PREMIUM.md §11, D-46): red, and the bigger the drop, the stronger the red
 * (Zaid, 15 Oct: "stronger red the more sale it is").
 */
export type DropTier = 'huge' | 'big' | 'medium' | 'small';

/** Lower bounds: 60 % and more `huge`, 40–59 % `big`, 20–39 % `medium`, below that `small`. */
export const DROP_TIERS = { huge: 0.6, big: 0.4, medium: 0.2 } as const;

/** The tier of a drop share (0.53 = 53 % less). Rounded like the label, so "−60 %" is huge. */
export function dropTier(drop: number): DropTier {
  const pct = Math.round(drop * 100) / 100;
  if (pct >= DROP_TIERS.huge) return 'huge';
  if (pct >= DROP_TIERS.big) return 'big';
  if (pct >= DROP_TIERS.medium) return 'medium';
  return 'small';
}

/**
 * A drop's id in links: the night (`2026-10-18`), or check-in and check-out for a longer stay
 * (`2026-11-03--2026-11-08`, C-080f, C-125).
 */
export function dropKey(d: { night: string; checkOut: string }): string {
  return daysBetween(d.night, d.checkOut) > 1 ? `${d.night}--${d.checkOut}` : d.night;
}

/** Reads `dropKey` back; null for anything else (1 to `DROPS.maxNights` nights). */
export function parseDropKey(key: string): { night: string; checkOut: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?:--(\d{4}-\d{2}-\d{2}))?$/.exec(key);
  if (!m?.[1]) return null;
  const night = m[1];
  if (!isoDateSchema.safeParse(night).success) return null;
  const checkOut = m[2] ?? addDays(night, 1);
  if (!isoDateSchema.safeParse(checkOut).success) return null;
  const n = daysBetween(night, checkOut);
  return n >= 1 && n <= DROPS.maxNights ? { night, checkOut } : null;
}

/** The shareable page of one drop, without locale prefix: `/price-drops/adlon/2026-10-18` (C-080b). */
export function dropPath(slug: string, d: { night: string; checkOut: string }): string {
  return `/price-drops/${slug}/${dropKey(d)}`;
}

/** "Di, 27. Okt." or, for a longer stay, "Di, 3. Nov. – So, 8. Nov." (C-080f, C-125). */
export function dropDates(d: { night: string; checkOut: string }, locale: Locale): string {
  return daysBetween(d.night, d.checkOut) > 1
    ? `${formatWeekdayDayMonth(d.night, locale)} – ${formatWeekdayDayMonth(d.checkOut, locale)}`
    : formatWeekdayDayMonth(d.night, locale);
}

/** One hotel's drop for one stay, if it is on today's radar (C-080b/f, C-125). */
export function findDrop<T extends HotelDrops>(
  groups: readonly T[],
  slug: string,
  stay: { night: string; checkOut: string },
): { group: T; drop: PriceDrop } | null {
  const group = groups.find((g) => g.hotel.slug === slug);
  const drop =
    group &&
    [group.top, ...group.more].find((d) => d.night === stay.night && d.checkOut === stay.checkOut);
  return group && drop ? { group, drop } : null;
}

/** The weekly recap (C-080h): how many drops, in how many hotels, how big. */
export interface WeekSummary {
  /** Drop events (a stay seen falling on one day). */
  drops: number;
  hotels: number;
  /** Average drop, 0.23 = 23 %. */
  average: number;
  biggest: number;
  /** Cities by number of drops, then biggest drop. */
  cities: { slug: string; name: { de: string; en: string }; drops: number; biggest: number }[];
}

/** Summarises a week of drop rows (SQL `radar_week`): every row is one drop event. */
export function weekSummary(rows: readonly PriceDropRow[]): WeekSummary {
  const cities = new Map<string, WeekSummary['cities'][number]>();
  for (const r of rows) {
    const c = cities.get(r.city_slug) ?? {
      slug: r.city_slug,
      name: { de: r.city_name_de, en: r.city_name_en },
      drops: 0,
      biggest: 0,
    };
    c.drops += 1;
    c.biggest = Math.max(c.biggest, r.drop_pct);
    cities.set(r.city_slug, c);
  }
  return {
    drops: rows.length,
    hotels: new Set(rows.map((r) => r.hotel_id)).size,
    average: rows.length ? rows.reduce((s, r) => s + r.drop_pct, 0) / rows.length : 0,
    biggest: rows.reduce((m, r) => Math.max(m, r.drop_pct), 0),
    cities: [...cities.values()].sort(
      (a, b) => b.drops - a.drops || b.biggest - a.biggest || a.name.de.localeCompare(b.name.de),
    ),
  };
}
