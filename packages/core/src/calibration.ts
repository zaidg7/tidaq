import { matchHotelSearch, nameWords, type SearchCandidate } from './hotelMatch';

/**
 * Taxes on our prices (C-157). Xotelo's rates are base rates; Google Hotels searched from Germany
 * shows final prices with taxes and fees. One search per city gives ~18 hotels with their nightly
 * price; each of ours that is clearly among them gives one point: Google's price ÷ our base rate
 * for the same nights. Pages multiply base rates by the median (SQL `hotel_price_factors`).
 */
export const CALIBRATION = {
  /** Outside this band the two prices aren't for the same thing (another room, a wrong match). */
  minRatio: 0.7,
  maxRatio: 1.6,
  /** A word in this many result titles says where, not which hotel ("Paris"): ignored. */
  noiseTitles: 3,
} as const;

export interface CalibrationHotel {
  hotelId: number;
  name: string;
  lat: number;
  lng: number;
  /** Google Hotels id when known: then only that result counts. */
  identifier: string | null;
  /** Our base rate per night for the searched stay (cents). */
  baseNightCents: number;
}

export interface CalibrationItem extends SearchCandidate {
  /** Google's price per night in EUR (whole euros), null when it shows none. */
  price: number | null;
}

export interface CalibrationPoint {
  hotelId: number;
  googleNightCents: number;
  baseNightCents: number;
  /** Rounded to 4 decimals, like the column. */
  ratio: number;
  /** Google's id for a hotel that had none, so the drop quotes can use it. */
  identifier: string | null;
}

/**
 * The points one search gives for a city's hotels. Pure. Words shared by several results (the
 * city's name) don't count as a name match, and a result that more than one of our hotels would
 * pair with is ambiguous: none of them gets a point from it.
 */
export function calibrationPoints(
  hotels: readonly CalibrationHotel[],
  items: readonly CalibrationItem[],
): CalibrationPoint[] {
  const priced = items.filter((i) => i.price !== null && i.price > 0);
  const titles = new Map<string, number>();
  for (const i of priced)
    for (const w of nameWords(i.title)) titles.set(w, (titles.get(w) ?? 0) + 1);
  const strip = (name: string) =>
    [...nameWords(name)].filter((w) => (titles.get(w) ?? 0) < CALIBRATION.noiseTitles).join(' ');
  const candidates = priced.map((i) => ({ ...i, title: strip(i.title) }));

  const pairs = hotels.flatMap((h) => {
    if (!(h.baseNightCents > 0)) return [];
    const id = h.identifier
      ? candidates.find((i) => i.id === h.identifier)?.id
      : matchHotelSearch({ ...h, name: strip(h.name) }, candidates)?.id;
    const item = id === undefined ? undefined : priced.find((i) => i.id === id);
    return item && item.price !== null ? [{ h, item, price: item.price }] : [];
  });
  const uses = new Map<string, number>();
  for (const p of pairs) uses.set(p.item.id, (uses.get(p.item.id) ?? 0) + 1);

  return pairs.flatMap(({ h, item, price }) => {
    if ((uses.get(item.id) ?? 0) > 1) return [];
    const googleNightCents = Math.round(price * 100);
    const ratio = Math.round((googleNightCents / h.baseNightCents) * 10_000) / 10_000;
    if (ratio < CALIBRATION.minRatio || ratio > CALIBRATION.maxRatio) return [];
    return [
      {
        hotelId: h.hotelId,
        googleNightCents,
        baseNightCents: h.baseNightCents,
        ratio,
        identifier: h.identifier ? null : item.id,
      },
    ];
  });
}

/** A base rate with taxes and fees (`factor` from `hotel_price_factors`, 1 when unknown). */
export function withTaxes(cents: number, factor: number | undefined): number {
  return factor && factor > 1 ? Math.round(cents * factor) : cents;
}
