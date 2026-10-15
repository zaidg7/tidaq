import { describe, expect, it } from 'vitest';
import {
  usualCents,
  dropPath,
  dropStats,
  dropStay,
  dropWhen,
  filterDrops,
  findDrop,
  groupDrops,
  priceDropRowSchema,
  sortDrops,
  type PriceDropRow,
} from './drops';

const TODAY = '2026-10-15';

const row = (over: Partial<PriceDropRow>): PriceDropRow => ({
  hotel_id: 1,
  hotel_slug: 'emirates-palace-abu-dhabi',
  hotel_name: 'Emirates Palace',
  city_slug: 'abu-dhabi',
  city_name_de: 'Abu Dhabi',
  city_name_en: 'Abu Dhabi',
  night: '2026-10-16',
  seen_day: TODAY,
  seen_at: '2026-10-15T03:12:00Z',
  now_cents: 40_500,
  prev_cents: 50_500,
  drop_pct: 0.198,
  prior_low_cents: 50_500,
  prior_days: 1,
  prior_avg_cents: 50_500,
  provider_slug: 'booking-com',
  provider_name: 'Booking.com',
  provider_direct: false,
  offers: 3,
  confirmed: false,
  ...over,
});

const rows: PriceDropRow[] = [
  row({ night: '2026-10-18', drop_pct: 0.198 }),
  row({ night: '2026-10-16', drop_pct: 0.198 }),
  row({ night: '2026-10-17', drop_pct: 0.1847, now_cents: 43_700, prev_cents: 53_600 }),
  row({
    hotel_id: 2,
    hotel_slug: 'shangri-la-paris',
    hotel_name: 'Shangri-La Paris',
    city_slug: 'paris',
    city_name_de: 'Paris',
    city_name_en: 'Paris',
    night: '2026-12-04',
    now_cents: 236_400,
    prev_cents: 327_300,
    drop_pct: 0.2777,
  }),
  row({
    hotel_id: 3,
    hotel_slug: 'hotel-eden-rom',
    hotel_name: 'Hotel Eden',
    city_slug: 'rom',
    city_name_de: 'Rom',
    city_name_en: 'Rome',
    night: '2026-10-30',
    now_cents: 130_200,
    prev_cents: 158_500,
    drop_pct: 0.1786,
  }),
];

describe('priceDropRowSchema', () => {
  it('accepts the SQL row (numeric as string) and rejects nonsense', () => {
    expect(priceDropRowSchema.parse({ ...row({}), drop_pct: '0.1980' }).drop_pct).toBe(0.198);
    expect(priceDropRowSchema.safeParse({ ...row({}), now_cents: 0 }).success).toBe(false);
    expect(priceDropRowSchema.safeParse({ ...row({}), drop_pct: 1.5 }).success).toBe(false);
    expect(priceDropRowSchema.safeParse({ ...row({}), hotel_slug: '../x' }).success).toBe(false);
  });
});

describe('groupDrops', () => {
  it('one entry per hotel, biggest drop on top, other nights by date, hotels by drop', () => {
    const g = groupDrops(rows);
    expect(g.map((x) => x.hotel.name)).toEqual([
      'Shangri-La Paris',
      'Emirates Palace',
      'Hotel Eden',
    ]);
    const ep = g[1];
    // Two nights tie at 19.8 %: the earlier night wins.
    expect(ep?.top.night).toBe('2026-10-16');
    expect(ep?.top.savedCents).toBe(10_000);
    expect(ep?.more.map((d) => d.night)).toEqual(['2026-10-17', '2026-10-18']);
    expect(ep?.city.name.en).toBe('Abu Dhabi');
  });

  it('is empty without rows', () => {
    expect(groupDrops([])).toEqual([]);
    expect(dropStats([])).toEqual({ nights: 0, hotels: 0, cities: 0, biggest: 0 });
  });
});

describe('dropWhen and filterDrops', () => {
  it('buckets nights into this week, the next 30 days and later', () => {
    expect(dropWhen('2026-10-16', TODAY)).toBe('week');
    expect(dropWhen('2026-10-22', TODAY)).toBe('week');
    expect(dropWhen('2026-10-23', TODAY)).toBe('month');
    expect(dropWhen('2026-11-14', TODAY)).toBe('month');
    expect(dropWhen('2026-11-15', TODAY)).toBe('later');
  });

  it('filters by city and time; a matching other night becomes the top entry', () => {
    const g = groupDrops(rows);
    expect(filterDrops(g, { city: 'paris', today: TODAY }).map((x) => x.hotel.name)).toEqual([
      'Shangri-La Paris',
    ]);
    expect(filterDrops(g, { when: 'later', today: TODAY }).map((x) => x.hotel.name)).toEqual([
      'Shangri-La Paris',
    ]);
    const month = filterDrops(g, { when: 'month', today: TODAY });
    expect(month.map((x) => x.hotel.name)).toEqual(['Hotel Eden']);
    const week = filterDrops(g, { when: 'week', today: TODAY });
    expect(week[0]?.top.night).toBe('2026-10-16');
    expect(week[0]?.more).toHaveLength(2);
    expect(filterDrops(g, { city: 'rom', when: 'week', today: TODAY })).toEqual([]);
  });
});

describe('sortDrops and dropStats', () => {
  it('sorts by percent, money saved or the soonest night', () => {
    const g = groupDrops(rows);
    expect(sortDrops(g, 'pct').map((x) => x.hotel.id)).toEqual([2, 1, 3]);
    expect(sortDrops(g, 'eur').map((x) => x.hotel.id)).toEqual([2, 3, 1]);
    expect(sortDrops(g, 'soon').map((x) => x.hotel.id)).toEqual([1, 3, 2]);
  });

  it('"soon" uses a hotel\'s earliest dropped night, not its biggest', () => {
    const g = groupDrops([
      row({ hotel_id: 1, hotel_name: 'A', night: '2026-11-20', drop_pct: 0.4 }),
      row({ hotel_id: 1, hotel_name: 'A', night: '2026-10-17', drop_pct: 0.16 }),
      row({ hotel_id: 2, hotel_name: 'B', night: '2026-10-20', drop_pct: 0.3 }),
    ]);
    expect(g[0]?.top.night).toBe('2026-11-20');
    expect(sortDrops(g, 'soon').map((x) => x.hotel.name)).toEqual(['A', 'B']);
  });

  it('counts nights, hotels, cities and the biggest drop', () => {
    expect(dropStats(groupDrops(rows))).toEqual({
      nights: 5,
      hotels: 3,
      cities: 3,
      biggest: 0.2777,
    });
  });

  it('maps a night to its one-night stay', () => {
    expect(dropStay('2026-12-31')).toEqual({ checkIn: '2026-12-31', checkOut: '2027-01-01' });
  });
});

describe('dropPath and findDrop (C-080b)', () => {
  it('builds the share path', () => {
    expect(dropPath('hotel-adlon', '2026-10-18')).toBe('/preissturz/hotel-adlon/2026-10-18');
  });

  it("finds a hotel's top drop or one of its other nights", () => {
    const g = groupDrops(rows);
    const top = g[0];
    expect(top).toBeDefined();
    if (!top) return;
    expect(findDrop(g, top.hotel.slug, top.top.night)?.drop).toBe(top.top);
    const other = g.find((x) => x.more.length > 0);
    expect(other).toBeDefined();
    if (!other?.more[0]) return;
    expect(findDrop(g, other.hotel.slug, other.more[0].night)?.drop).toBe(other.more[0]);
    expect(findDrop(g, top.hotel.slug, '2030-01-01')).toBeNull();
    expect(findDrop(g, 'gibt-es-nicht', top.top.night)).toBeNull();
  });
});

describe('usualCents (C-080d)', () => {
  const [g] = groupDrops([row({ prior_days: 3, prior_avg_cents: 52_000 })]);

  it('is the average of the earlier checks once there are enough of them', () => {
    expect(g && usualCents(g.top)).toBe(52_000);
  });

  it("is null with too few checks or an average not above today's price", () => {
    const [few] = groupDrops([row({ prior_days: 2, prior_avg_cents: 52_000 })]);
    const [below] = groupDrops([row({ prior_days: 5, prior_avg_cents: 40_000 })]);
    expect(few && usualCents(few.top)).toBeNull();
    expect(below && usualCents(below.top)).toBeNull();
  });
});
