import { describe, expect, it } from 'vitest';
import { cheapestStays, priceLevels, stayFromNights, type NightPrice } from './hotelCalendar';

describe('priceLevels', () => {
  it('puts each price into its fifth, cheapest = 0, dearest = 4', () => {
    expect(priceLevels([100, 200, 300, 400, 500])).toEqual([0, 1, 2, 3, 4]);
    expect(priceLevels([500, 100, null, 300])).toEqual([3, 0, null, 1]);
  });

  it('gives equal prices the same level and a flat month the middle one', () => {
    expect(priceLevels([100, 100, 200, 300, 400])).toEqual([0, 0, 2, 3, 4]);
    expect(priceLevels([250, 250, null])).toEqual([2, 2, null]);
    expect(priceLevels([])).toEqual([]);
    expect(priceLevels([null])).toEqual([null]);
  });
});

describe('stayFromNights', () => {
  const night = (n: string, perProvider: Record<string, number>): NightPrice => ({
    night: n,
    bestCents: Math.min(...Object.values(perProvider)),
    perProvider,
  });
  const nights = [
    night('2026-12-01', { '1': 30_000, '4': 29_000, '9': 20_000 }),
    night('2026-12-02', { '1': 31_000, '4': 33_000 }),
    night('2026-12-03', { '1': 32_000, '4': 30_000, '9': 21_000 }),
  ];
  const reviewed = new Set([1, 4]);

  it('takes the cheapest reviewed platform that priced every night, never mixing sites', () => {
    // Site 4 is cheapest on nights 1 and 3, site 1 on night 2; per site: 1 = 93,000, 4 = 92,000.
    expect(stayFromNights(nights, '2026-12-01', '2026-12-04', reviewed)).toEqual({
      kind: 'ok',
      totalCents: 92_000,
      providerId: 4,
      nights: 3,
    });
    expect(stayFromNights(nights, '2026-12-02', '2026-12-03', reviewed)).toEqual({
      kind: 'ok',
      totalCents: 31_000,
      providerId: 1,
      nights: 1,
    });
  });

  it('only counts the platforms in `reviewed` (site 9 is pending)', () => {
    expect(stayFromNights(nights, '2026-12-01', '2026-12-02', new Set([1, 4, 9]))).toMatchObject({
      providerId: 9,
    });
    expect(stayFromNights(nights, '2026-12-01', '2026-12-02', reviewed)).toMatchObject({
      providerId: 4,
      totalCents: 29_000,
    });
  });

  it('says when nights are missing or no reviewed site priced them all', () => {
    expect(stayFromNights(nights, '2026-12-02', '2026-12-05', reviewed)).toEqual({
      kind: 'missing',
      nights: 3,
      missing: 1,
    });
    const gaps = [night('2026-12-01', { '1': 1 }), night('2026-12-02', { '4': 1 })];
    expect(stayFromNights(gaps, '2026-12-01', '2026-12-03', reviewed)).toEqual({
      kind: 'none',
      nights: 2,
    });
  });

  it('rejects an empty or reversed stay', () => {
    expect(() => stayFromNights(nights, '2026-12-02', '2026-12-02', reviewed)).toThrow(RangeError);
  });
});

describe('cheapestStays', () => {
  // 2026-12-01 is a Tuesday. Site 1 prices every night; site 4 only some; site 9 is unreviewed.
  const prices: Record<string, number> = {
    '2026-12-01': 30_000, // Tue
    '2026-12-02': 31_000,
    '2026-12-03': 32_000,
    '2026-12-04': 50_000, // Fri
    '2026-12-05': 52_000,
    '2026-12-06': 28_000,
    '2026-12-07': 28_000,
    '2026-12-08': 25_000, // Tue
    '2026-12-09': 26_000,
    '2026-12-10': 27_000,
    '2026-12-11': 45_000, // Fri
    '2026-12-12': 46_000,
  };
  const nights: NightPrice[] = Object.entries(prices).map(([n, cents]) => ({
    night: n,
    bestCents: cents,
    perProvider: { '1': cents, '9': cents - 10_000 },
  }));
  const reviewed = new Set([1]);

  it('finds the cheapest Fri → Sun and Tue → Thu stay on one reviewed site', () => {
    expect(cheapestStays(nights, '2026-11-30', reviewed)).toEqual({
      weekend: {
        checkIn: '2026-12-11',
        checkOut: '2026-12-13',
        totalCents: 91_000,
        providerId: 1,
        nights: 2,
      },
      midweek: {
        checkIn: '2026-12-08',
        checkOut: '2026-12-10',
        totalCents: 51_000,
        providerId: 1,
        nights: 2,
      },
    });
  });

  it('skips today and stays whose nights are not all priced', () => {
    // 12 Dec has no next night: the 11 Dec weekend has no total, so 4 Dec wins.
    const short = nights.filter((n) => n.night !== '2026-12-12');
    expect(cheapestStays(short, '2026-11-30', reviewed).weekend?.checkIn).toBe('2026-12-04');
    // Check-in today doesn't count: the next Tuesday is the only midweek stay left.
    expect(cheapestStays(nights, '2026-12-01', reviewed).midweek?.checkIn).toBe('2026-12-08');
    expect(cheapestStays(nights, '2026-12-08', reviewed).midweek).toBeNull();
  });

  it('keeps the earlier date on a tie and returns nulls without reviewed prices', () => {
    const flat = nights.map((n) => ({ ...n, perProvider: { '1': 20_000 } }));
    expect(cheapestStays(flat, '2026-11-30', reviewed).weekend?.checkIn).toBe('2026-12-04');
    expect(cheapestStays(nights, '2026-11-30', new Set([4]))).toEqual({
      weekend: null,
      midweek: null,
    });
    expect(cheapestStays([], '2026-11-30', reviewed)).toEqual({ weekend: null, midweek: null });
  });
});
