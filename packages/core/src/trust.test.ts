import { describe, expect, it } from 'vitest';
import {
  checkoutMarkup,
  providerScore,
  TRUST,
  trustLevel,
  trustOutcome,
  type TrustTestPrices,
} from './trust';

describe('trustLevel', () => {
  it('needs at least 5 tests and a score', () => {
    expect(trustLevel(95, TRUST.minTests - 1)).toBe('insufficient');
    expect(trustLevel(null, 25)).toBe('insufficient');
    expect(trustLevel(Number.NaN, 25)).toBe('insufficient');
    expect(trustLevel(95, TRUST.minTests)).toBe('high');
  });

  it('uses the DESIGN.md thresholds 85 and 60', () => {
    expect(trustLevel(85, 25)).toBe('high');
    expect(trustLevel(84.9, 25)).toBe('mid');
    expect(trustLevel(60, 25)).toBe('mid');
    expect(trustLevel(59, 25)).toBe('low');
    expect(trustLevel(0, 25)).toBe('low');
  });
});

const t = (listed: number, checkout: number | null): TrustTestPrices => ({
  listedCents: listed,
  checkoutCents: checkout,
});
const repeat = (n: number, test: TrustTestPrices) => Array.from({ length: n }, () => test);

describe('checkout markup and outcome', () => {
  it('computes the markup and treats ±1 % as a match', () => {
    expect(checkoutMarkup(t(100_000, 114_000))).toBeCloseTo(0.14);
    expect(checkoutMarkup(t(100_000, null))).toBeNull();
    expect(trustOutcome(t(100_000, 101_000))).toBe('match');
    expect(trustOutcome(t(100_000, 99_000))).toBe('match');
    expect(trustOutcome(t(100_000, 101_100))).toBe('higher');
    expect(trustOutcome(t(100_000, 98_000))).toBe('lower');
    expect(trustOutcome(t(100_000, null))).toBe('unavailable');
  });
});

describe('providerScore (PLAN §8.2)', () => {
  it('has no score without tests', () => {
    expect(providerScore([])).toBeNull();
  });

  it('shrinks small samples: 2 perfect tests show 79, not 100', () => {
    expect(providerScore(repeat(2, t(50_000, 50_000)))?.score).toBe(79);
  });

  it('matches the worked example: 24 of 25 right, one +14 %', () => {
    const tests = [...repeat(24, t(100_000, 100_000)), t(100_000, 114_000)];
    expect(providerScore(tests)).toEqual({ tests: 25, matches: 24, avgMarkupPct: 0.6, score: 91 });
  });

  it('counts cheaper checkouts as passed and unavailable ones as failed', () => {
    const s = providerScore([t(100_000, 95_000), t(100_000, null)]);
    expect(s?.matches).toBe(1);
    // accuracy 0.5, no positive markups → raw 50; (2·50 + 5·70) / 7 = 64.3
    expect(s?.score).toBe(64);
    expect(s?.avgMarkupPct).toBe(-5);
  });

  it('caps the penalty at 40 points and never goes below 0', () => {
    const half = [...repeat(5, t(100_000, 100_000)), ...repeat(5, t(100_000, 130_000))];
    // penalty min(40, 0.30·200) = 40; raw = 50 − 40·0.5 = 30; (10·30 + 350) / 15 = 43.3
    expect(providerScore(half)?.score).toBe(43);
    expect(providerScore(repeat(5, t(100_000, 150_000)))?.score).toBe(35);
    expect(providerScore(repeat(5, t(100_000, null)))).toEqual({
      tests: 5,
      matches: 0,
      avgMarkupPct: null,
      score: 35,
    });
  });
});
