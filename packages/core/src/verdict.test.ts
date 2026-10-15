import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { meter, verdictFacts } from './verdict';

const TODAY = '2026-10-13';
const series = (prices: number[]) =>
  prices.map((bestCents, i) => ({ day: addDays(TODAY, i - prices.length + 1), bestCents }));

describe('verdictFacts', () => {
  it('counts earlier days that were pricier or cheaper than now', () => {
    const f = verdictFacts(series([120, 130, 110, 125, 100, 140, 115]), TODAY, 115);
    expect(f).toMatchObject({
      n: 7,
      pricierDays: 4,
      cheaperDays: 2,
      firstDay: '2026-10-07',
      verdictOn: null,
    });
  });

  it('ignores days outside the 60-day window and in the future', () => {
    const f = verdictFacts(
      [
        { day: addDays(TODAY, -60), bestCents: 999 },
        { day: addDays(TODAY, -59), bestCents: 200 },
        { day: TODAY, bestCents: 100 },
        { day: addDays(TODAY, 1), bestCents: 1 },
      ],
      TODAY,
      100,
    );
    expect(f.n).toBe(2);
    expect(f.pricierDays).toBe(1);
  });

  it('says when the first verdict is due while collecting', () => {
    expect(verdictFacts(series([100, 110, 105]), TODAY, 105).verdictOn).toBe('2026-10-17');
    expect(verdictFacts([], TODAY, null)).toMatchObject({
      n: 0,
      verdictOn: '2026-10-19',
      firstDay: null,
    });
  });
});

describe('meter', () => {
  it('splits where the verdict states split', () => {
    expect(meter(0)?.zone).toBe('cheap');
    expect(meter(0.35)?.zone).toBe('cheap');
    expect(meter(0.5)?.zone).toBe('normal');
    expect(meter(0.75)?.zone).toBe('dear');
    expect(meter(1)).toEqual({ position: 1, zone: 'dear', bounds: [0.35, 0.75] });
  });
  it('clamps and handles no percentile', () => {
    expect(meter(1.4)?.position).toBe(1);
    expect(meter(-0.2)?.position).toBe(0);
    expect(meter(null)).toBeNull();
  });
});
