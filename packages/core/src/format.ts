export type Locale = 'de' | 'en';

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
