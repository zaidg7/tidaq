import 'server-only';
import { cache } from 'react';
import { withTaxes, z } from '@tidaq/core';
import { hasSupabase, rpc } from './supabase';
import { reportError } from '@/lib/errors';

const factorRow = z.object({ hotel_id: z.number(), factor: z.coerce.number(), source: z.string() });

/**
 * Each hotel's tax factor (C-157, SQL `hotel_price_factors`): our nightly prices are base rates
 * without taxes and fees; times this factor they match what Google shows a German visitor. A hotel
 * without one (no measurement yet in its city or country) keeps its base rate. Cached per request.
 */
export const getPriceFactors = cache(async (): Promise<ReadonlyMap<number, number>> => {
  if (!hasSupabase()) return new Map();
  try {
    const rows = await rpc('hotel_price_factors', {}, z.array(factorRow));
    return new Map(rows.map((r) => [r.hotel_id, r.factor]));
  } catch (error) {
    // Without factors pages still show base rates rather than nothing.
    reportError('price factors unavailable', error);
    return new Map();
  }
});

/** A function adding this hotel's taxes to a base rate. */
export async function taxesFor(hotelId: number): Promise<(cents: number) => number> {
  const factor = (await getPriceFactors()).get(hotelId);
  return (cents) => withTaxes(cents, factor);
}

/** `{ "<provider id>": cents }` with taxes on every value. */
export function taxedRecord(
  record: Readonly<Record<string, number>>,
  tax: (cents: number) => number,
): Record<string, number> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, tax(v)]));
}
