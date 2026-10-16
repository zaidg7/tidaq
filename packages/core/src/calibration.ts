import { matchHotelSearch, type SearchCandidate } from './hotelMatch';

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

/** The points one search gives for a city's hotels. Pure. */
export function calibrationPoints(
  hotels: readonly CalibrationHotel[],
  items: readonly CalibrationItem[],
): CalibrationPoint[] {
  const priced = items.filter((i) => i.price !== null && i.price > 0);
  return hotels.flatMap((h) => {
    if (!(h.baseNightCents > 0)) return [];
    const item = h.identifier
      ? priced.find((i) => i.id === h.identifier)
      : (() => {
          const m = matchHotelSearch(h, priced);
          return m ? priced.find((i) => i.id === m.id) : undefined;
        })();
    if (!item || item.price === null) return [];
    const googleNightCents = Math.round(item.price * 100);
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
