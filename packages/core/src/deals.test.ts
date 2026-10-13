import { describe, expect, it } from 'vitest';
import { pickDeals } from './deals';

const row = (
  stayId: number,
  hotelSlug: string,
  nowCents: number | null,
  avg30Cents: number | null,
  daysTracked = 20,
) => ({
  stayId,
  hotelSlug,
  nowCents,
  avg30Cents,
  daysTracked,
});

describe('pickDeals', () => {
  it('keeps stays at least 8 % below their average, biggest drop first', () => {
    const deals = pickDeals([
      row(1, 'a', 92_000, 100_000),
      row(2, 'b', 86_000, 100_000),
      row(3, 'c', 95_000, 100_000),
    ]);
    expect(deals.map((d) => d.stayId)).toEqual([2, 1]);
    expect(deals[0]?.drop).toBeCloseTo(-0.14);
  });

  it('needs 14 days of history and both prices', () => {
    expect(
      pickDeals([
        row(1, 'a', 80_000, 100_000, 13),
        row(2, 'b', null, 100_000),
        row(3, 'c', 80_000, null),
      ]),
    ).toEqual([]);
  });

  it('shows one stay per hotel and at most three', () => {
    const deals = pickDeals([
      row(1, 'a', 80_000, 100_000),
      row(2, 'a', 70_000, 100_000),
      row(3, 'b', 85_000, 100_000),
      row(4, 'c', 85_000, 100_000, 30),
      row(5, 'd', 90_000, 100_000),
    ]);
    expect(deals.map((d) => d.stayId)).toEqual([2, 4, 3]);
  });
});
