import { z } from './zod';

/**
 * Zod schemas for the DataForSEO Google Hotels API, drafted from real responses
 * (tests/fixtures/dataforseo, C-010 spike, 12 Oct 2026). Only the fields we use are listed;
 * unknown fields are stripped. Report: docs/research/dataforseo.md.
 */

/** Status codes seen in the spike. */
export const DFS_OK = 20000;
export const DFS_TASK_CREATED = 20100;
export const DFS_NO_RESULTS = 40102;
/** `task_get` before the result is ready: "Task Handed." / "Task in Queue." (keep polling). */
export const DFS_TASK_HANDED = 40601;
export const DFS_TASK_IN_QUEUE = 40602;

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

export const dfsOfferSchema = z.object({
  title: z.string(),
  price: z.number().nullable(),
  currency: nullableString,
  url: nullableString,
  max_visitors: nullableNumber,
  free_cancellation_until: nullableString,
});

/** One booking site in Google Hotels. `price` is per night (see the report for exceptions). */
export const dfsPriceItemSchema = z.object({
  type: z.literal('hotel_info_price'),
  title: z.string(),
  price: z.number().nullable(),
  currency: nullableString,
  url: nullableString,
  domain: nullableString,
  /** Google ad ("Gesponsert"); duplicates an organic entry of the same site. */
  is_paid: z.boolean(),
  official_site: z.boolean(),
  free_cancellation_until: nullableString,
  offers: z.array(dfsOfferSchema).nullable().optional(),
});

/** Cheapest 1-night price per check-in date (`load_prices_by_dates`, double cost). */
export const dfsPriceByDateSchema = z.object({
  price: z.number().nullable(),
  currency: nullableString,
  check_in_date: z.string(),
  check_out_date: z.string(),
});

export const dfsHotelPricesSchema = z.object({
  /** Lowest per-night price across `items`. */
  price: z.number().nullable(),
  currency: nullableString,
  check_in: nullableString,
  check_out: nullableString,
  visitors: nullableNumber,
  items: z.array(dfsPriceItemSchema).nullable(),
  prices_by_dates: z.array(dfsPriceByDateSchema).nullable().optional(),
});

const locationSchema = z
  .object({ latitude: nullableNumber, longitude: nullableNumber })
  .nullable()
  .optional();

export const dfsHotelInfoResultSchema = z.object({
  hotel_identifier: z.string(),
  title: z.string(),
  /** Unreliable: 0 for Waldorf Astoria Berlin in the spike. */
  stars: nullableNumber,
  check_url: nullableString,
  address: nullableString,
  location: locationSchema,
  /** `about.url` is the hotel's official website (with tracking parameters). */
  about: z.object({ url: nullableString, domain: nullableString }).nullable().optional(),
  /** When Google was queried, e.g. `2026-10-12 16:06:07 +00:00`. */
  datetime: nullableString,
  prices: dfsHotelPricesSchema.nullable(),
});

export const dfsHotelSearchItemSchema = z.object({
  type: z.literal('hotel_search_item'),
  hotel_identifier: z.string(),
  title: z.string(),
  stars: nullableNumber,
  is_paid: z.boolean(),
  location: locationSchema,
  prices: z
    .object({ price: z.number().nullable(), currency: nullableString })
    .nullable()
    .optional(),
});

export const dfsHotelSearchResultSchema = z.object({
  keyword: z.string(),
  check_url: nullableString,
  items_count: z.number(),
  items: z.array(dfsHotelSearchItemSchema).nullable(),
});

const taskDataSchema = z.object({
  tag: z.string().optional(),
  hotel_identifier: z.string().optional(),
  keyword: z.string().optional(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  adults: z.number().optional(),
  currency: z.string().optional(),
});

function envelope<T extends z.ZodType>(result: T) {
  return z.object({
    status_code: z.number(),
    status_message: z.string(),
    cost: z.number(),
    tasks: z.array(
      z.object({
        id: z.string(),
        status_code: z.number(),
        status_message: z.string(),
        cost: z.number(),
        data: taskDataSchema,
        result: z.array(result).nullable(),
      }),
    ),
  });
}

export const dfsHotelInfoResponseSchema = envelope(dfsHotelInfoResultSchema);
export const dfsHotelSearchResponseSchema = envelope(dfsHotelSearchResultSchema);

/** `tasks_ready`: tasks whose results can be fetched (free). Each appears until fetched. */
export const dfsTasksReadyResponseSchema = z.object({
  status_code: z.number(),
  status_message: z.string(),
  tasks: z
    .array(
      z.object({
        status_code: z.number(),
        status_message: z.string(),
        result: z.array(z.object({ id: z.string(), tag: nullableString })).nullable(),
      }),
    )
    .nullable(),
});

export type DfsPriceItem = z.infer<typeof dfsPriceItemSchema>;
export type DfsHotelInfoResult = z.infer<typeof dfsHotelInfoResultSchema>;
export type DfsHotelInfoResponse = z.infer<typeof dfsHotelInfoResponseSchema>;
export type DfsHotelSearchItem = z.infer<typeof dfsHotelSearchItemSchema>;
