import { describe, expect, it } from 'vitest';
import { priceLevels, stayFromNights, type NightPrice } from './hotelCalendar';

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
