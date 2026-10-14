import type { Locale } from './format';

/**
 * Cities and regions for the city pages and the hotel directory (C-024). A "city" in our
 * catalog can also be a country (the Maldives) or span several towns (Miami + Miami Beach), so
 * the phrases live here instead of being built from the name.
 */

/** City page path, German slug (`/stadt/berlin`); English under `/en`. */
export function cityPath(slug: string): string {
  return `/stadt/${slug}`;
}

/** "in Berlin", but "auf den Malediven" / "in the Maldives". */
const IN_PHRASE: Record<string, Record<Locale, string>> = {
  malediven: { de: 'auf den Malediven', en: 'in the Maldives' },
};

export function cityIn(slug: string, name: string, locale: Locale): string {
  return IN_PHRASE[slug]?.[locale] ?? `in ${name}`;
}

/** Directory regions in display order; the Maldives count as Asia (Indian Ocean). */
export const REGIONS = ['germany', 'europe', 'middleEast', 'asiaPacific', 'americas'] as const;
export type Region = (typeof REGIONS)[number];

const REGION_BY_COUNTRY: Record<string, Region> = {
  DE: 'germany',
  AE: 'middleEast',
  QA: 'middleEast',
  SA: 'middleEast',
  OM: 'middleEast',
  US: 'americas',
  CA: 'americas',
  MX: 'americas',
  BR: 'americas',
  AU: 'asiaPacific',
  CN: 'asiaPacific',
  HK: 'asiaPacific',
  ID: 'asiaPacific',
  IN: 'asiaPacific',
  JP: 'asiaPacific',
  KR: 'asiaPacific',
  MV: 'asiaPacific',
  MY: 'asiaPacific',
  SG: 'asiaPacific',
  TH: 'asiaPacific',
  VN: 'asiaPacific',
};

/** Region of an ISO country code; anything not listed is Europe (most of our catalog). */
export function regionOf(countryCode: string): Region {
  return REGION_BY_COUNTRY[countryCode.toUpperCase()] ?? 'europe';
}

/**
 * Groups items by region (in `REGIONS` order, empty regions left out) and sorts each group by
 * the locale's name, as `/ranking` promises: by city, then name.
 */
export function groupByRegion<T>(
  items: readonly T[],
  country: (item: T) => string,
  name: (item: T) => string,
  locale: Locale,
): { region: Region; items: T[] }[] {
  const collator = new Intl.Collator(locale);
  return REGIONS.map((region) => ({
    region,
    items: items
      .filter((i) => regionOf(country(i)) === region)
      .sort((a, b) => collator.compare(name(a), name(b))),
  })).filter((g) => g.items.length > 0);
}
