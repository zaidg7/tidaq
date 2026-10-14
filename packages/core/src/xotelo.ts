import type { DfsHotelInfoResult, DfsPriceItem } from './dataforseo';
import { z } from './zod';

/**
 * Xotelo (D-41): a free, keyless hotel price API based on TripAdvisor's meta search
 * (`https://data.xotelo.com/api/rates`). One call = one hotel, one stay, about 3–6 booking sites
 * with a nightly rate each. No SLA and no published terms: call it gently and keep DataForSEO as
 * the fallback (`PRICE_SOURCE`).
 */
export const XOTELO = {
  ratesUrl: 'https://data.xotelo.com/api/rates',
  /** Pause between calls in one collector run: gentle on a donation-run service. */
  delayMs: 400,
  timeoutMs: 20_000,
  /** Collector task ids for Xotelo jobs start with this (DataForSEO ids are UUIDs). */
  taskPrefix: 'xo-',
} as const;

export const xoteloRateSchema = z.object({
  code: z.string(),
  name: z.string(),
  rate: z.number().nullable(),
  /** Taxes and fees per night when shown separately; usually null (rate includes them). */
  tax: z.number().nullable().optional(),
});

export const xoteloRatesResponseSchema = z.object({
  error: z.object({ status_code: z.number(), message: z.string() }).nullable(),
  result: z
    .object({
      chk_in: z.string(),
      chk_out: z.string(),
      currency: z.string(),
      rates: z.array(xoteloRateSchema),
    })
    .nullable(),
  timestamp: z.number().optional(),
});

export type XoteloRate = z.infer<typeof xoteloRateSchema>;
export type XoteloRatesResponse = z.infer<typeof xoteloRatesResponseSchema>;

/** The rates URL for one stay, prices in EUR. */
export function xoteloRatesUrl(stay: {
  hotelKey: string;
  checkIn: string;
  checkOut: string;
  adults: number;
}): string {
  const q = new URLSearchParams({
    hotel_key: stay.hotelKey,
    chk_in: stay.checkIn,
    chk_out: stay.checkOut,
    adults: String(stay.adults),
    currency: 'EUR',
  });
  return `${XOTELO.ratesUrl}?${q}`;
}

/** `xo-<run>-<stay>`: unique per run and stay, like a DataForSEO task id. */
export function xoteloTaskId(runId: number, stayId: number): string {
  return `${XOTELO.taskPrefix}${runId}-${stayId}`;
}

export function isXoteloTask(taskId: string): boolean {
  return taskId.startsWith(XOTELO.taskPrefix);
}

/** `Booking.com` → `booking.com`; brand names without a dot ("IHG", "Fairmont") have no domain. */
function domainOf(name: string): string | null {
  const n = name.trim().toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(n) ? n : null;
}

/**
 * Xotelo rates as DataForSEO price items, so `normalizeHotelInfo` handles both sources the same
 * way (aliases, pending providers, outliers, nightly → stay total). The nightly price is
 * `rate + tax` when the tax is shown separately.
 */
export function xoteloPriceItems(rates: readonly XoteloRate[]): DfsPriceItem[] {
  return rates.map((r) => ({
    type: 'hotel_info_price',
    title: r.name,
    price: r.rate === null ? null : r.rate + (r.tax ?? 0),
    currency: 'EUR',
    url: null,
    domain: domainOf(r.name),
    is_paid: false,
    official_site: false,
    free_cancellation_until: null,
    offers: null,
  }));
}

export type XoteloOutcome =
  | { kind: 'done'; result: Pick<DfsHotelInfoResult, 'prices'> }
  | { kind: 'no_results' }
  | { kind: 'failed'; error: string };

/**
 * Reads a rates response for the stay that was asked for: an API error or a different stay or
 * currency fails, no rates means no results.
 */
export function xoteloOutcome(
  body: unknown,
  stay: { checkIn: string; checkOut: string },
): XoteloOutcome {
  const parsed = xoteloRatesResponseSchema.safeParse(body);
  if (!parsed.success) return { kind: 'failed', error: 'unexpected response shape' };
  const { error, result } = parsed.data;
  if (error) return { kind: 'failed', error: `${error.status_code} ${error.message}` };
  if (!result) return { kind: 'failed', error: 'empty result' };
  if (result.chk_in !== stay.checkIn || result.chk_out !== stay.checkOut) {
    return { kind: 'failed', error: `answered ${result.chk_in}–${result.chk_out}` };
  }
  if (result.currency !== 'EUR') return { kind: 'failed', error: `currency ${result.currency}` };
  const items = xoteloPriceItems(result.rates).filter((i) => i.price !== null && i.price > 0);
  if (items.length === 0) return { kind: 'no_results' };
  const cheapest = Math.min(...items.map((i) => i.price as number));
  return {
    kind: 'done',
    result: {
      prices: {
        price: cheapest,
        currency: 'EUR',
        check_in: result.chk_in,
        check_out: result.chk_out,
        visitors: null,
        items,
      },
    },
  };
}
