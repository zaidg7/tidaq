import { daysBetween, parseIsoDate } from './dates';

export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

const INTL_LOCALE: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' };

const priceFormatters = new Map<Locale, Intl.NumberFormat>();

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

export interface PriceParts {
  /** Grouped whole euros: `1.184` (de), `1,184` (en). Negative amounts carry a real minus `−`. */
  amount: string;
  /** English puts `€` first (`€1,184`), German after a space (`1.184 €`). */
  currencyFirst: boolean;
}

/**
 * The parts of `formatPrice` for typeset display (small €, narrow no-break space; CRAFT.md §2).
 * Joined back (`amount + ' €'` / `'€' + amount`) they equal `formatPrice` apart from the space.
 */
export function priceParts(cents: number, locale: Locale): PriceParts {
  const formatted = formatPrice(cents, locale);
  const amount = formatted.replace(/[€\s\u00a0\u202f]/g, '').replace(/^-/, '−');
  return { amount, currencyFirst: locale === 'en' };
}

// Own month names instead of Intl: ICU versions differ between Node, CI and workerd
// (e.g. spacing around the dash, "Sep" vs "Sept"), and SSR output must be identical everywhere.
const MONTHS: Record<Locale, readonly string[]> = {
  de: [
    'Jan.',
    'Feb.',
    'März',
    'Apr.',
    'Mai',
    'Juni',
    'Juli',
    'Aug.',
    'Sept.',
    'Okt.',
    'Nov.',
    'Dez.',
  ],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function dayMonth(date: Date, locale: Locale): string {
  const month = MONTHS[locale][date.getUTCMonth()];
  return locale === 'de' ? `${date.getUTCDate()}. ${month}` : `${date.getUTCDate()} ${month}`;
}

const WEEKDAYS: Record<Locale, readonly string[]> = {
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** `Sa, 17. Okt.` / `Sat, 17 Oct` (when something is due). */
export function formatWeekdayDayMonth(day: string, locale: Locale): string {
  const date = new Date(parseIsoDate(day));
  return `${WEEKDAYS[locale][date.getUTCDay()]}, ${dayMonth(date, locale)}`;
}

const BERLIN = 'Europe/Berlin';

/**
 * When the data is from, in German time (CRAFT.md "Stand"): `{ day: 'today', time: '07:12' }`,
 * `'yesterday'`, or `'date'` with `date: '11. Okt.'`. Pass `now` for testable output.
 */
export function updatedAtParts(
  iso: string,
  now: Date,
  locale: Locale,
): { day: 'today' | 'yesterday' | 'date'; date: string; time: string } {
  const at = new Date(iso);
  const ymd = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BERLIN,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const time = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: BERLIN,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
  const atDay = ymd(at);
  const diff = daysBetween(atDay, ymd(now));
  const day = diff === 0 ? 'today' : diff === 1 ? 'yesterday' : 'date';
  return { day, date: formatDayMonth(atDay, locale), time };
}

/** A `YYYY-MM-DD` date as `15. Okt.` / `15 Oct` (chart axes, tooltips, "seit …"). */
export function formatDayMonth(day: string, locale: Locale): string {
  return dayMonth(new Date(parseIsoDate(day)), locale);
}

/** A `YYYY-MM-DD` date with its year: `15. Okt. 2026` / `15 Oct 2026` ("Stand", test dates). */
export function formatDayMonthYear(day: string, locale: Locale): string {
  const date = new Date(parseIsoDate(day));
  return `${dayMonth(date, locale)} ${date.getUTCFullYear()}`;
}

/**
 * Formats a stay as a compact date range.
 * Same month: `1.–3. Dez. 2026` / `1–3 Dec 2026`.
 * Different months: `28. Nov. – 3. Dez. 2026` / `28 Nov – 3 Dec 2026`.
 * Different years: `30. Dez. 2026 – 1. Jan. 2027` / `30 Dec 2026 – 1 Jan 2027`.
 * Dates are `YYYY-MM-DD` and read as UTC, so the viewer's time zone never shifts a stay date.
 */
export function formatDateRange(checkIn: string, checkOut: string, locale: Locale): string {
  const from = new Date(parseIsoDate(checkIn));
  const to = new Date(parseIsoDate(checkOut));
  const fromYear = from.getUTCFullYear();
  const toYear = to.getUTCFullYear();

  if (fromYear !== toYear) {
    return `${dayMonth(from, locale)} ${fromYear} – ${dayMonth(to, locale)} ${toYear}`;
  }
  if (from.getUTCMonth() !== to.getUTCMonth()) {
    return `${dayMonth(from, locale)} – ${dayMonth(to, locale)} ${toYear}`;
  }
  const fromDay = locale === 'de' ? `${from.getUTCDate()}.` : `${from.getUTCDate()}`;
  return `${fromDay}–${dayMonth(to, locale)} ${toYear}`;
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
