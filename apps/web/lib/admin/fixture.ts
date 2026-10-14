import type { AuditTest } from './audit';
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
  nights: {
    day: '2026-10-13',
    hotels: 35,
    rows: 3912,
    priced: 3720,
    last_collected_at: '2026-10-13T11:58:00Z',
    runs: 109,
    errors: 0,
  },
  accuracy: [
    {
      day: '2026-10-12',
      pairs: 524,
      within_05: 231,
      within_3: 320,
      within_10: 421,
      median_gap_pct: 1.36,
      stays: 160,
      stays_within_3: 96,
      pairs_shown: 418,
      within_3_shown: 309,
      worst: [
        { hotel_id: 7, slug: 'rosewood-munich', name: 'Rosewood Munich', pairs: 15, within_3: 0 },
        {
          hotel_id: 34,
          slug: 'hotel-de-russie-rom',
          name: 'Hotel de Russie',
          pairs: 15,
          within_3: 1,
        },
      ],
    },
    {
      day: '2026-10-11',
      pairs: 498,
      within_05: 260,
      within_3: 401,
      within_10: 470,
      median_gap_pct: 0.4,
      stays: 155,
      stays_within_3: 128,
      pairs_shown: 480,
      within_3_shown: 396,
      worst: [],
    },
  ],
  night_hidden: [
    { id: 7, name: 'Rosewood Munich', pairs: 21, within_3: 1, gap_pct: 25.04 },
    { id: 25, name: 'Shangri-La Paris', pairs: 24, within_3: 11, gap_pct: -5.68 },
  ],
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

export const auditOptionsFixture = {
  hotels: [
    { id: 1, name: 'Hotel Adlon Kempinski' },
    { id: 16, name: 'Villa Kennedy' },
  ],
  providers: [
    { id: 1, name: 'Booking.com' },
    { id: 2, name: 'Expedia' },
  ],
};

export const auditTestsFixture: AuditTest[] = [
  {
    id: 2,
    provider_id: 2,
    hotel_id: 1,
    check_in: '2026-12-04',
    check_out: '2026-12-06',
    adults: 2,
    listed_cents: 118_400,
    checkout_cents: 128_900,
    outcome: 'higher',
    extras: ['city_tax', 'fees'],
    notes: null,
    screenshot_path: '2026-10/beispiel.png',
    tested_at: '2026-10-13T11:40:00Z',
    providers: { name: 'Expedia' },
    hotels: { name: 'Hotel Adlon Kempinski' },
  },
  {
    id: 1,
    provider_id: 1,
    hotel_id: 1,
    check_in: '2026-12-04',
    check_out: '2026-12-06',
    adults: 2,
    listed_cents: 118_400,
    checkout_cents: 118_400,
    outcome: 'match',
    extras: [],
    notes: null,
    screenshot_path: null,
    tested_at: '2026-10-13T11:35:00Z',
    providers: { name: 'Booking.com' },
    hotels: { name: 'Hotel Adlon Kempinski' },
  },
];
