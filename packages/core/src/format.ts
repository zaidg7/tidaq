import { parseIsoDate } from './dates';

export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

const INTL_LOCALE: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' };

const priceFormatters = new Map<Locale, Intl.NumberFormat>();
const dateRangeFormatters = new Map<Locale, Intl.DateTimeFormat>();

/**
 * Formats a stay total in EUR cents for display, without cents (D-21).
 * `de`: `1.184 €` · `en`: `€1,184`. Intl uses a no-break space before `€` in German.
 */
export function formatPrice(cents: number, locale: Locale): string {
  if (!Number.isFinite(cents)) {
    throw new RangeError(`Price must be a finite number of cents, got ${cents}`);
  }
  let formatter = priceFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    priceFormatters.set(locale, formatter);
  }
  return formatter.format(cents / 100);
}

/**
 * Formats a stay as a compact date range.
 * `de`: `1.–3. Dez. 2026` · `en`: `1–3 Dec 2026`. Dates are `YYYY-MM-DD` and formatted in UTC,
 * so the viewer's time zone never shifts a stay date.
 */
export function formatDateRange(checkIn: string, checkOut: string, locale: Locale): string {
  let formatter = dateRangeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    dateRangeFormatters.set(locale, formatter);
  }
  return formatter.formatRange(parseIsoDate(checkIn), parseIsoDate(checkOut));
}

export interface PercentOptions {
  /** Show `+` for positive values (price deltas). Default false. */
  signed?: boolean;
  /** Fraction digits. Default 0. */
  digits?: number;
}

/**
 * Formats a ratio as a percentage: `-0.14` → `-14 %` (de) / `-14%` (en).
 */
export function formatPercent(ratio: number, locale: Locale, options: PercentOptions = {}): string {
  if (!Number.isFinite(ratio)) {
    throw new RangeError(`Percent must be a finite number, got ${ratio}`);
  }
  const digits = options.digits ?? 0;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'percent',
    signDisplay: options.signed ? 'exceptZero' : 'auto',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio);
}
