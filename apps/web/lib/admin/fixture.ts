import type { AdminHealth } from './db';

/**
 * Made-up dashboard data for the `/dev/admin` preview and tests: no real admin data ever
 * renders outside the guarded `/admin` page.
 */
export const adminHealthFixture: AdminHealth = {
  today: '2026-10-13',
  generated_at: '2026-10-13T12:00:00Z',
  last_run_at: '2026-10-13T05:21:00Z',
  month_cost_usd: 3.4176,
  coverage: { hotels: 36, stays: 396, with_today: 365, with_yesterday: 371 },
  days: [
    {
      day: '2026-10-13',
      runs: 16,
      posted: 396,
      collected: 376,
      skipped: 0,
      cost_usd: 0.3168,
      errors: 2,
      unfinished: 0,
      first_error: 'stay 214: 40501 Invalid Field: hotel_identifier',
      budget_reason: 'ok',
    },
    {
      day: '2026-10-12',
      runs: 15,
      posted: 400,
      collected: 371,
      skipped: 12,
      cost_usd: 0.32,
      errors: 0,
      unfinished: 0,
      first_error: null,
      budget_reason: 'daily_cap',
    },
  ],
  stale_hotels: [
    { id: 16, slug: 'villa-kennedy-frankfurt', name: 'Villa Kennedy', last_day: null },
  ],
  inactive_hotels: [{ id: 2, slug: 'hotel-de-rome-berlin', name: 'Hotel de Rome' }],
  pending_total: 64,
  pending_providers: [
    {
      id: 38,
      slug: 'luxuryescapes-com',
      name: 'Luxury Escapes',
      domain: 'luxuryescapes.com',
      offers: 378,
      last_seen: '2026-10-13T05:02:19Z',
    },
    {
      id: 41,
      slug: 'opodo-de',
      name: 'Opodo',
      domain: 'accommodation.opodo.de',
      offers: 335,
      last_seen: '2026-10-13T05:02:19Z',
    },
  ],
};
