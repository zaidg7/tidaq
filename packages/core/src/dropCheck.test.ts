import { describe, expect, it } from 'vitest';
import { DROP_CHECK, judgeDropCheck } from './dropCheck';

const drop = { providerSlug: 'booking-com', nowCents: 100_000 };

describe('judgeDropCheck (C-139)', () => {
  it('keeps a drop the site still offers at the price, or cheaper', () => {
    expect(
      judgeDropCheck(drop, [
        { slug: 'booking-com', totalCents: 100_000 },
        { slug: 'agoda', totalCents: 98_000 },
      ]),
    ).toEqual({ live: true, cents: 100_000, bestCents: 98_000 });
    expect(judgeDropCheck(drop, [{ slug: 'booking-com', totalCents: 90_000 }]).live).toBe(true);
  });

  it('allows a small rise, not more', () => {
    const edge = Math.round(drop.nowCents * (1 + DROP_CHECK.tolerance));
    expect(judgeDropCheck(drop, [{ slug: 'booking-com', totalCents: edge }]).live).toBe(true);
    expect(judgeDropCheck(drop, [{ slug: 'booking-com', totalCents: edge + 1 }]).live).toBe(false);
  });

  it('is gone when the site no longer offers it or nobody does', () => {
    expect(judgeDropCheck(drop, [{ slug: 'agoda', totalCents: 80_000 }])).toEqual({
      live: false,
      cents: null,
      bestCents: 80_000,
    });
    expect(judgeDropCheck(drop, [])).toEqual({ live: false, cents: null, bestCents: null });
  });

  it('takes the cheapest offer of the site when it has several', () => {
    expect(
      judgeDropCheck(drop, [
        { slug: 'booking-com', totalCents: 120_000 },
        { slug: 'booking-com', totalCents: 101_000 },
      ]),
    ).toMatchObject({ live: true, cents: 101_000 });
  });
});
