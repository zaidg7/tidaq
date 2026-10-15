import { describe, expect, it } from 'vitest';
import { pickFeaturedStay, type FeaturedCandidate } from './featured';

const TODAY = '2026-10-13';
const row = (over: Partial<FeaturedCandidate>): FeaturedCandidate => ({
  stayId: 1,
  checkIn: '2026-11-06',
  daysTracked: 10,
  state: 'normal',
  nowCents: 100_000,
  hasImage: false,
  ...over,
});

describe('pickFeaturedStay', () => {
  it('prefers more history, then a useful verdict, then a photo, then the nearest date', () => {
    const rows = [
      row({ stayId: 1, daysTracked: 9, state: 'near_low', hasImage: true }),
      row({ stayId: 2, daysTracked: 12, state: 'high' }),
      row({ stayId: 3, daysTracked: 12, state: 'good' }),
      row({ stayId: 4, daysTracked: 12, state: 'good', hasImage: true, checkIn: '2026-12-04' }),
      row({ stayId: 5, daysTracked: 12, state: 'good', hasImage: true, checkIn: '2026-11-20' }),
    ];
    expect(pickFeaturedStay(rows, TODAY)?.stayId).toBe(5);
  });

  it('skips stays without a price, without data or checking in within a week', () => {
    const rows = [
      row({ stayId: 1, nowCents: null }),
      row({ stayId: 2, daysTracked: 0 }),
      row({ stayId: 3, daysTracked: null }),
      row({ stayId: 4, checkIn: '2026-10-19' }),
      row({ stayId: 5, checkIn: '2026-10-20', daysTracked: 1, state: null }),
    ];
    expect(pickFeaturedStay(rows, TODAY)?.stayId).toBe(5);
  });

  it('returns null when nothing qualifies', () => {
    expect(pickFeaturedStay([], TODAY)).toBeNull();
    expect(pickFeaturedStay([row({ nowCents: null })], TODAY)).toBeNull();
  });

  it("with prefer 'cheap', puts a stay with a cheap verdict first", () => {
    const rows = [
      row({ stayId: 1, daysTracked: 20, state: 'normal', hasImage: true }),
      row({ stayId: 2, daysTracked: 8, state: 'good' }),
      row({ stayId: 3, daysTracked: 5, state: 'near_low' }),
    ];
    expect(pickFeaturedStay(rows, TODAY, 'cheap')?.stayId).toBe(2);
    expect(pickFeaturedStay(rows, TODAY)?.stayId).toBe(1);
    // No cheap verdict yet (too few days): back to the most history.
    const [normal, , early] = rows;
    expect(
      pickFeaturedStay(
        [normal, early].filter((r) => r !== undefined),
        TODAY,
        'cheap',
      )?.stayId,
    ).toBe(1);
  });
});
