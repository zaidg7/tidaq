import { z } from 'zod';
import { addDays, daysBetween } from './dates';

/**
 * Sudden price drops (C-080a, Preissturz-Radar): nights whose cheapest reviewed price fell sharply
 * since the previous day's check and reached a new low (SQL `price_drops`). This file groups them
 * per hotel and filters them for the radar, the homepage and city pages. Facts only (CLAUDE.md
 * rule 8): both prices, the day seen, the site; no countdowns, no "only today".
 */
export const DROPS = {
  /** At least this much below the previous day's price (SQL `price_drops` uses the same). */
  minDrop: 0.15,
  /** And at least this many cents less. */
  minCents: 5000,
  /** Other nights listed under a hotel's biggest drop. */
  moreNights: 3,
  /** "Diese Woche": nights within this many days. */
  weekDays: 7,
  /** "Nächste 30 Tage". */
  monthDays: 30,
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
  seen_day: day,
  seen_at: z.string(),
  now_cents: cents,
  prev_cents: cents,
  drop_pct: z.coerce.number().positive().max(1),
  prior_low_cents: cents,
  prior_days: z.number().int().nonnegative(),
  provider_slug: z.string(),
  provider_name: z.string(),
  provider_direct: z.boolean(),
  offers: z.number().int().nonnegative(),
  confirmed: z.boolean(),
});
export type PriceDropRow = z.infer<typeof priceDropRowSchema>;

export interface PriceDrop {
  night: string;
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
  provider: { slug: string; name: string; direct: boolean };
  /** Reviewed sites with a price for this night. */
  offers: number;
}

export interface HotelDrops {
  hotel: { id: number; slug: string; name: string };
  city: { slug: string; name: { de: string; en: string } };
  /** The hotel's biggest drop. */
  top: PriceDrop;
  /** Its other dropped nights, by date (all of them; pages show `DROPS.moreNights`). */
  more: PriceDrop[];
}

function toDrop(r: PriceDropRow): PriceDrop {
  return {
    night: r.night,
    seenDay: r.seen_day,
    seenAt: r.seen_at,
    nowCents: r.now_cents,
    prevCents: r.prev_cents,
    drop: r.drop_pct,
    savedCents: r.prev_cents - r.now_cents,
    priorDays: r.prior_days,
    provider: { slug: r.provider_slug, name: r.provider_name, direct: r.provider_direct },
    offers: r.offers,
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
    const drops = list
      .map(toDrop)
      .sort((a, b) => b.drop - a.drop || a.night.localeCompare(b.night));
    const [top, ...rest] = drops;
    const first = list[0];
    if (!top || !first) continue;
    groups.push({
      hotel: { id: first.hotel_id, slug: first.hotel_slug, name: first.hotel_name },
      city: { slug: first.city_slug, name: { de: first.city_name_de, en: first.city_name_en } },
      top,
      more: rest.sort((a, b) => a.night.localeCompare(b.night)),
    });
  }
  return groups.sort(byDrop);
}

const byDrop = (a: HotelDrops, b: HotelDrops) =>
  b.top.drop - a.top.drop ||
  b.top.savedCents - a.top.savedCents ||
  a.hotel.name.localeCompare(b.hotel.name);

export type DropWhen = 'week' | 'month' | 'later';
export type DropSort = 'pct' | 'eur' | 'soon';
export const DROP_WHENS: readonly DropWhen[] = ['week', 'month', 'later'];
export const DROP_SORTS: readonly DropSort[] = ['pct', 'eur', 'soon'];

/** Which "Wann" bucket a night falls in, seen from `today`. */
export function dropWhen(night: string, today: string): DropWhen {
  const d = daysBetween(today, night);
  if (d <= DROPS.weekDays) return 'week';
  if (d <= DROPS.monthDays) return 'month';
  return 'later';
}

/**
 * Filters the hotels by city and "Wann". With a time filter a hotel stays when any of its
 * nights matches, and that night becomes its top entry.
 */
export function filterDrops<T extends HotelDrops>(
  groups: readonly T[],
  f: { city?: string | null; when?: DropWhen | null; today: string },
): T[] {
  const out: T[] = [];
  for (const g of groups) {
    if (f.city && g.city.slug !== f.city) continue;
    if (!f.when) {
      out.push(g);
      continue;
    }
    const all = [g.top, ...g.more].filter((d) => dropWhen(d.night, f.today) === f.when);
    const [top, ...rest] = all.sort((a, b) => b.drop - a.drop || a.night.localeCompare(b.night));
    if (top) out.push({ ...g, top, more: rest.sort((a, b) => a.night.localeCompare(b.night)) });
  }
  return out.sort(byDrop);
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

/** Headline numbers for the radar: drops (nights), hotels, cities, the biggest drop. */
export function dropStats(groups: readonly HotelDrops[]) {
  return {
    nights: groups.reduce((n, g) => n + 1 + g.more.length, 0),
    hotels: groups.length,
    cities: new Set(groups.map((g) => g.city.slug)).size,
    biggest: groups.reduce((m, g) => Math.max(m, g.top.drop), 0),
  };
}

/** The 1-night stay a drop belongs to (check-in = the night). */
export function dropStay(night: string): { checkIn: string; checkOut: string } {
  return { checkIn: night, checkOut: addDays(night, 1) };
}
