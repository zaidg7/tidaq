import { describe, expect, it } from 'vitest';
import {
  defaultLocale,
  formatDateRange,
  formatPercent,
  formatPrice,
  isLocale,
  locales,
} from './format';

// Intl puts a no-break space (U+00A0) between amount and € in German.
const nbsp = '\u00a0';

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

describe('formatDateRange', () => {
  it('formats a stay within one month', () => {
    expect(formatDateRange('2026-12-01', '2026-12-03', 'de')).toBe('1.–3. Dez. 2026');
    expect(formatDateRange('2026-12-01', '2026-12-03', 'en')).toBe('1–3 Dec 2026');
  });

  it('formats a stay across months', () => {
    expect(formatDateRange('2026-11-28', '2026-12-03', 'de')).toBe('28. Nov. – 3. Dez. 2026');
    expect(formatDateRange('2026-11-28', '2026-12-03', 'en')).toBe('28 Nov – 3 Dec 2026');
  });

  it('formats a stay across years (New Year)', () => {
    expect(formatDateRange('2026-12-30', '2027-01-01', 'de')).toBe('30. Dez. 2026 – 1. Jan. 2027');
    expect(formatDateRange('2026-12-30', '2027-01-01', 'en')).toBe('30 Dec 2026 – 1 Jan 2027');
  });

  it('uses German month abbreviations', () => {
    expect(formatDateRange('2027-03-05', '2027-03-07', 'de')).toBe('5.–7. März 2027');
    expect(formatDateRange('2027-09-17', '2027-09-19', 'de')).toBe('17.–19. Sept. 2027');
    expect(formatDateRange('2027-09-17', '2027-09-19', 'en')).toBe('17–19 Sep 2027');
  });

  it('formats every month', () => {
    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, '0');
      expect(formatDateRange(`2027-${mm}-01`, `2027-${mm}-03`, 'de')).toMatch(/^1\.–3\. \S+ 2027$/);
      expect(formatDateRange(`2027-${mm}-01`, `2027-${mm}-03`, 'en')).toMatch(
        /^1–3 [A-Z][a-z]{2} 2027$/,
      );
    }
  });

  it('rejects invalid dates', () => {
    expect(() => formatDateRange('2026-12-01', '2026-12-32', 'de')).toThrow();
  });
});

describe('formatPercent', () => {
  it('formats negative deltas', () => {
    expect(formatPercent(-0.14, 'de')).toBe(`-14${nbsp}%`);
    expect(formatPercent(-0.14, 'en')).toBe('-14%');
  });

  it('adds a plus sign when signed', () => {
    expect(formatPercent(0.035, 'de', { signed: true })).toBe(`+4${nbsp}%`);
    expect(formatPercent(0.035, 'en', { signed: true, digits: 1 })).toBe('+3.5%');
    expect(formatPercent(0.035, 'de', { signed: true, digits: 1 })).toBe(`+3,5${nbsp}%`);
  });

  it('never signs zero', () => {
    expect(formatPercent(0, 'de', { signed: true })).toBe(`0${nbsp}%`);
  });

  it('rejects non-finite input', () => {
    expect(() => formatPercent(Number.NaN, 'en')).toThrow(RangeError);
  });
});

describe('isLocale', () => {
  it('accepts supported locales only', () => {
    expect(isLocale('de')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('defaults to German', () => {
    expect(defaultLocale).toBe('de');
    expect(locales).toEqual(['de', 'en']);
  });
});
