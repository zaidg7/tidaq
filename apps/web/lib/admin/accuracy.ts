import 'server-only';
import { z } from '@tidaq/core';
import { serviceRest } from './db';

/**
 * Our calculated prices against the exact prices the sites show (C-182, SQL `accuracy_stats`):
 * per day and site, pairs of an exact quote and a live check within 6 hours. Service role, only
 * after `requireAdmin()`.
 */
const row = z.object({
  day: z.string(),
  provider: z.string(),
  pairs: z.coerce.number().int(),
  median_ratio: z.coerce.number().nullable(),
  median_abs_pct: z.coerce.number().nullable(),
  within_5: z.coerce.number().int(),
  within_10: z.coerce.number().int(),
});
export type AccuracyRow = z.infer<typeof row>;

export type AccuracyLoad =
  { kind: 'ok'; rows: AccuracyRow[] } | { kind: 'missing' } | { kind: 'error' };

export async function getAccuracy(days = 14): Promise<AccuracyLoad> {
  try {
    const rows = await serviceRest('rpc/accuracy_stats', z.array(row), {
      method: 'POST',
      body: { p_days: days },
      prefer: 'return=representation',
    });
    return { kind: 'ok', rows };
  } catch (error) {
    // 404 until the C-182 migration is applied.
    return String(error).includes('Supabase 404') ? { kind: 'missing' } : { kind: 'error' };
  }
}

/** All days per site: pairs, share within 5 % and 10 %, weighted. */
export function bySite(rows: AccuracyRow[]) {
  const sites = new Map<string, { pairs: number; within5: number; within10: number }>();
  for (const r of rows) {
    const s = sites.get(r.provider) ?? { pairs: 0, within5: 0, within10: 0 };
    s.pairs += r.pairs;
    s.within5 += r.within_5;
    s.within10 += r.within_10;
    sites.set(r.provider, s);
  }
  return [...sites.entries()]
    .map(([provider, s]) => ({ provider, ...s }))
    .sort((a, b) => b.pairs - a.pairs);
}
