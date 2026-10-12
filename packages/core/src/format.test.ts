import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

// Intl puts a no-break space (U+00A0) between amount and € in German.
const nbsp = ' ';

describe('formatPrice', () => {
  it('formats German totals as "1.184 €"', () => {
    expect(formatPrice(118_400, 'de')).toBe(`1.184${nbsp}€`);
  });

  it('formats English totals as "€1,184"', () => {
    expect(formatPrice(118_400, 'en')).toBe('€1,184');
  });

  it('rounds cents to whole euros', () => {
    expect(formatPrice(118_449, 'de')).toBe(`1.184${nbsp}€`);
    expect(formatPrice(118_450, 'de')).toBe(`1.185${nbsp}€`);
  });

  it('handles zero and small amounts', () => {
    expect(formatPrice(0, 'de')).toBe(`0${nbsp}€`);
    expect(formatPrice(99, 'en')).toBe('€1');
  });

  it('formats negative amounts (price deltas)', () => {
    expect(formatPrice(-12_000, 'de')).toBe(`-120${nbsp}€`);
    expect(formatPrice(-12_000, 'en')).toBe('-€120');
  });

  it('formats large totals with thousands separators', () => {
    expect(formatPrice(1_234_567_00, 'de')).toBe(`1.234.567${nbsp}€`);
  });

  it('rejects non-finite input', () => {
    expect(() => formatPrice(Number.NaN, 'de')).toThrow(RangeError);
    expect(() => formatPrice(Number.POSITIVE_INFINITY, 'en')).toThrow(RangeError);
  });
});
