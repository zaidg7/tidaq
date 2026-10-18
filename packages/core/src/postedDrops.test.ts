import { describe, expect, it } from 'vitest';
import { groupDrops, type PriceDropRow } from './drops';
import {
  POSTED,
  postedDropInsert,
  postedDropRowSchema,
  postedDrops,
  postedStatus,
  type PostedDropRow,
} from './postedDrops';

const base: PriceDropRow = {
  hotel_id: 7,
  hotel_slug: 'hotel-adlon-kempinski-berlin',
  hotel_name: 'Hotel Adlon Kempinski',
  city_slug: 'berlin',
  city_name_de: 'Berlin',
  city_name_en: 'Berlin',
  night: '2026-10-23',
  check_out: '2026-10-25',
  seen_day: '2026-10-13',
  seen_at: '2026-10-13T04:10:00Z',
  now_cents: 61_800,
  prev_cents: 89_400,
  drop_pct: 0.3087,
  prior_low_cents: 84_000,
  prior_days: 6,
  prior_avg_cents: 91_200,
  provider_slug: 'booking-com',
  provider_name: 'Booking.com',
  provider_direct: false,
  offers: 4,
  confirmed: true,
};

const posted = (over: Partial<PostedDropRow> = {}): PostedDropRow => ({
  ...base,
  check_out: '2026-10-25',
  posted_on: '2026-10-13',
  platforms: ['tiktok'],
  ...over,
});

describe('postedDropRowSchema (C-080j)', () => {
  it('accepts the SQL row and rejects unknown platforms or none', () => {
    expect(postedDropRowSchema.parse({ ...posted(), drop_pct: '0.3087' }).drop_pct).toBe(0.3087);
    expect(postedDropRowSchema.safeParse(posted({ platforms: [] })).success).toBe(false);
    expect(postedDropRowSchema.safeParse({ ...posted(), platforms: ['facebook'] }).success).toBe(
      false,
    );
    expect(postedDropRowSchema.safeParse(posted({ platforms: ['youtube'] })).success).toBe(true);
  });
});

describe('postedDrops', () => {
  it('keeps the SQL order, one entry per stay, at most POSTED.max', () => {
    const rows = Array.from({ length: POSTED.max + 2 }, (_, i) =>
      posted({ hotel_id: i + 1, hotel_slug: `hotel-${i + 1}`, platforms: ['instagram', 'tiktok'] }),
    );
    const list = postedDrops(rows);
    expect(list).toHaveLength(POSTED.max);
    expect(list[0]).toMatchObject({ postedOn: '2026-10-13', platforms: ['instagram', 'tiktok'] });
    expect(list[0]?.group.top).toMatchObject({ night: '2026-10-23', checkOut: '2026-10-25' });
    expect(list[0]?.group.more).toEqual([]);
    expect(postedDrops([])).toEqual([]);
  });
});

describe('postedStatus', () => {
  const [p] = postedDrops([posted()]);

  it('is live while the same stay is on the radar, with the current prices', () => {
    const today = groupDrops([{ ...base, seen_day: '2026-10-15', now_cents: 59_900 }]);
    const s = p && postedStatus(p, today);
    expect(s).toMatchObject({ live: true, drop: { nowCents: 59_900 } });
  });

  it('is over when the stay left the radar (or only another stay of the hotel dropped)', () => {
    expect(p && postedStatus(p, [])).toEqual({ live: false });
    const other = groupDrops([{ ...base, night: '2026-10-24', check_out: undefined }]);
    expect(p && postedStatus(p, other)).toEqual({ live: false });
  });
});

describe('postedDropInsert', () => {
  it('snapshots the drop as the posted_drops row', () => {
    const [g] = groupDrops([base]);
    expect(g && postedDropInsert(g, g.top, 'tiktok', '2026-10-15')).toEqual({
      hotel_id: 7,
      night: '2026-10-23',
      check_out: '2026-10-25',
      platform: 'tiktok',
      posted_on: '2026-10-15',
      seen_day: '2026-10-13',
      seen_at: '2026-10-13T04:10:00Z',
      now_cents: 61_800,
      prev_cents: 89_400,
      drop_pct: 0.3087,
      prior_low_cents: 84_000,
      prior_days: 6,
      prior_avg_cents: 91_200,
      provider_slug: 'booking-com',
      offers: 4,
      confirmed: true,
    });
  });
});
