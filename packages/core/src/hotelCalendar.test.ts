import { describe, expect, it } from 'vitest';
import {
  cheapestInMonth,
  cheapestStays,
  priceLevels,
  stayFromNights,
  weekendStays,
  type NightPrice,
} from './hotelCalendar';

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

  it('finds the cheapest 5 nights and week on one reviewed site, any check-in day (C-125)', () => {
    expect(cheapestStays(nights, '2026-11-30', reviewed)).toEqual({
      // 6–10 Dec: 28 + 28 + 25 + 26 + 27 = 134.000 (the unreviewed site 9 never counts).
      trip: {
        checkIn: '2026-12-06',
        checkOut: '2026-12-11',
        totalCents: 134_000,
        providerId: 1,
        nights: 5,
      },
      // 6–12 Dec: 28 + 28 + 25 + 26 + 27 + 45 + 46 = 225.000 beats 1–7 Dec (251.000).
      week: {
        checkIn: '2026-12-06',
        checkOut: '2026-12-13',
        totalCents: 225_000,
        providerId: 1,
        nights: 7,
      },
    });
  });

  it('skips today and stays whose nights are not all priced', () => {
    // Without 9 Dec no stay can cross it: only stays ending by 8 Dec are left.
    const gap = nights.filter((n) => n.night !== '2026-12-09');
    expect(cheapestStays(gap, '2026-11-30', reviewed).trip?.checkIn).toBe('2026-12-04');
    expect(cheapestStays(gap, '2026-11-30', reviewed).week?.checkIn).toBe('2026-12-02');
    // Check-in today doesn't count; too few nights left means no stay.
    expect(cheapestStays(nights, '2026-12-01', reviewed).trip?.checkIn).toBe('2026-12-06');
    expect(cheapestStays(nights, '2026-12-08', reviewed).week).toBeNull();
  });

  it('keeps the earlier date on a tie and returns nulls without reviewed prices', () => {
    const flat = nights.map((n) => ({ ...n, perProvider: { '1': 20_000 } }));
    expect(cheapestStays(flat, '2026-11-30', reviewed).trip?.checkIn).toBe('2026-12-01');
    expect(cheapestStays(nights, '2026-11-30', new Set([4]))).toEqual({ trip: null, week: null });
    expect(cheapestStays([], '2026-11-30', reviewed)).toEqual({ trip: null, week: null });
  });
});

describe('weekendStays', () => {
  // Fri 6 Nov 2026 … ; site 1 prices every night, site 2 only some.
  const night = (date: string, a?: number, b?: number): NightPrice => ({
    night: date,
    bestCents: Math.min(a ?? Infinity, b ?? Infinity),
    perProvider: { ...(a && { '1': a }), ...(b && { '2': b }) },
  });
  const nights = [
    night('2026-11-06', 40_000, 30_000),
    night('2026-11-07', 42_000),
    night('2026-11-13', 35_000, 33_000),
    night('2026-11-14', 36_000, 34_000),
    night('2026-11-20', 50_000),
  ];

  it('totals each Fri → Sun on one reviewed site, never mixing sites', () => {
    expect(weekendStays(nights, '2026-11-01', new Set([1, 2]))).toEqual([
      { checkIn: '2026-11-06', checkOut: '2026-11-08', totalCents: 82_000 },
      { checkIn: '2026-11-13', checkOut: '2026-11-15', totalCents: 67_000 },
    ]);
  });

  it('skips weekends up to today and unreviewed sites', () => {
    expect(weekendStays(nights, '2026-11-06', new Set([1])).map((s) => s.checkIn)).toEqual([
      '2026-11-13',
    ]);
    expect(weekendStays(nights, '2026-11-01', new Set([3]))).toEqual([]);
  });
});

describe('cheapestInMonth', () => {
  const stays = [
    { checkIn: '2026-11-06', totalCents: 900 },
    { checkIn: '2026-11-13', totalCents: 700 },
    { checkIn: '2026-11-20', totalCents: 700 },
    { checkIn: '2026-11-27', totalCents: 800 },
    { checkIn: '2026-12-04', totalCents: 100 },
  ];
  it('keeps the month, cheapest first, earlier date on a tie', () => {
    expect(cheapestInMonth(stays, '2026-11-01').map((s) => s.checkIn)).toEqual([
      '2026-11-13',
      '2026-11-20',
      '2026-11-27',
    ]);
    expect(cheapestInMonth(stays, '2026-12-01', 1)).toEqual([stays[4]]);
    expect(cheapestInMonth(stays, '2027-01-01')).toEqual([]);
  });
});
