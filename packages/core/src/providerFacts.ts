import { z } from 'zod';

/**
 * Public provider facts (C-034) from the SQL function `provider_facts()`: today's night grid per
 * reviewed provider and the aggregates of our checkout tests. Shown on `/anbieter/[slug]` and
 * `/methodik`. Facts only (CLAUDE.md rule 8): counts, shares and dates, never a judgement.
 */

/** Extras recorded with a checkout test (admin form, C-032a), in display order. */
export const TEST_EXTRAS = [
  'city_tax',
  'fees',
  'breakfast_missing',
  'other_room',
  'not_bookable',
] as const;
export type TestExtra = (typeof TEST_EXTRAS)[number];

const count = z.number().int().nonnegative();
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
// numeric columns arrive as JSON numbers; null when there's nothing to average.
const pct = z.number().nullable();

export const providerFactSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  is_direct: z.boolean(),
  hotels: count,
  nights: count,
  compared: count,
  cheapest: count,
  median_gap_pct: pct,
  tests: count,
  matches: count,
  higher: count,
  lower: count,
  unavailable: count,
  avg_markup_pct: pct,
  score: z.number().int().min(0).max(100).nullable(),
  extras: z.record(z.string(), count),
  first_test: day,
  last_test: day,
});

export const providerFactsSchema = z.object({
  /** Newest night-grid day; null without a collection in the last week. */
  day,
  hotels: count,
  cities: count,
  /** (hotel, night) pairs with at least one price in today's grid. */
  nights: count,
  providers: z.array(providerFactSchema),
  /** Night-sum accuracy over the last 30 days (`night_accuracy`); `days` is 0 without data. */
  accuracy: z.object({
    days: count,
    since: day,
    pairs: count,
    within_3: count,
    stays: count,
    stays_within_3: count,
    median_gap_pct: pct,
  }),
  tests: z.object({ n: count, providers: count, last: day }),
});

export type ProviderFact = z.infer<typeof providerFactSchema>;
export type ProviderFacts = z.infer<typeof providerFactsSchema>;

/** `/anbieter/booking-com`. */
export function providerPath(slug: string): string {
  return `/anbieter/${slug}`;
}

/** Whole percent of `part` in `total`; null when there is nothing to divide by. */
export function percentOf(part: number, total: number): number | null {
  if (!(total > 0)) return null;
  return Math.round((part / total) * 100);
}

/**
 * A provider gets a page once there is something to say: prices in today's grid or at least one
 * checkout test. Otherwise the page would be empty, so it's a 404 and stays out of the sitemap.
 */
export function hasProviderPage(p: Pick<ProviderFact, 'nights' | 'tests'>): boolean {
  return p.nights > 0 || p.tests > 0;
}

/**
 * Recorded extras, most frequent first (ties in `TEST_EXTRAS` order). Unknown keys from the
 * database are dropped so a typo never reaches a page.
 */
export function extrasByCount(extras: Record<string, number>): { key: TestExtra; n: number }[] {
  return TEST_EXTRAS.map((key) => ({ key, n: extras[key] ?? 0 }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n || TEST_EXTRAS.indexOf(a.key) - TEST_EXTRAS.indexOf(b.key));
}
