import type { DfsHotelInfoResult, DfsPriceItem } from './dataforseo';

/** Slug of the provider that stands for "booked on the hotel's own website". */
export const DIRECT_PROVIDER = 'hotel-direct';

/** PLAN §7.3 and TASKS C-014 thresholds. */
export const NORMALIZE = {
  /** Below this share of the stay's median price an offer is an outlier. */
  outlierLow: 0.3,
  /** Above this multiple of the median an offer is an outlier. */
  outlierHigh: 4,
  /** An offer within ±25 % of `nights × median` is probably a stay total, not a nightly price. */
  totalTolerance: 0.25,
} as const;

export interface NormalizedOffer {
  /** Provider slug from the alias table, or `null` if the source is unknown. */
  providerSlug: string | null;
  /** Suggested slug for an unknown source (from its domain or name). */
  sourceSlug: string;
  sourceName: string;
  sourceDomain: string | null;
  /** The provider's nightly price as shown, in EUR cents. */
  nightlyCents: number;
  /** Stay total: nightly × nights (PLAN §7.3). */
  totalCents: number;
  isOfficial: boolean;
  /** Organic link to the provider. Never a Google ad-click URL. Null if only an ad exists. */
  url: string | null;
  /** ISO datetime until which cancellation is free, or null. */
  freeCancellationUntil: string | null;
  /** Probably reported a stay total instead of a nightly price (≈ nights × median). */
  suspectedTotal: boolean;
  /** Price < 30 % or > 400 % of the median: not trusted. */
  outlier: boolean;
  /** May be used as the stay's best price and in the provider table. */
  eligible: boolean;
  /** The source item(s) the offer was built from, for `price_snapshots.raw`. */
  raw: { nightly: true; items: DfsPriceItem[] };
}

export interface DroppedItem {
  reason: 'no_price' | 'currency' | 'no_source';
  item: DfsPriceItem;
}

export interface NormalizeResult {
  offers: NormalizedOffer[];
  dropped: DroppedItem[];
  /** Eligible offers' median nightly price in cents, or null without offers. */
  medianNightlyCents: number | null;
}

/** Lowercases and trims; used for alias keys. */
export function aliasKey(value: string): string {
  return value.trim().toLowerCase();
}

/** `www.booking.com` → `booking.com`, `hotel.check24.de` → `check24.de`, `x.co.uk` → `x.co.uk`. */
export function registrableDomain(domain: string): string {
  const labels = aliasKey(domain).replace(/\.$/, '').split('.');
  const secondLevel = new Set(['co', 'com', 'org', 'net', 'ac', 'gov']);
  const keep = labels.length >= 3 && secondLevel.has(labels.at(-2) ?? '') ? 3 : 2;
  return labels.slice(-keep).join('.');
}

/** A URL-safe slug: `Booking.com` → `booking-com`, `müv AI` → `muev-ai`. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const isAdDomain = (domain: string | null | undefined): boolean =>
  !domain || /(^|\.)google\.[a-z.]+$/.test(aliasKey(domain));

/**
 * Finds the provider slug for an item: official site → `hotel-direct`; else the alias table by
 * full domain, registrable domain, then the site name. Ads have `google.de` as domain, so for
 * them only the name counts.
 */
export function resolveProvider(
  item: Pick<DfsPriceItem, 'title' | 'domain' | 'official_site'>,
  aliases: ReadonlyMap<string, string>,
): string | null {
  if (item.official_site) return DIRECT_PROVIDER;
  const keys: string[] = [];
  if (!isAdDomain(item.domain) && item.domain) {
    keys.push(aliasKey(item.domain), aliasKey(item.domain).replace(/^www\./, ''));
    keys.push(registrableDomain(item.domain));
  }
  keys.push(aliasKey(item.title));
  for (const key of keys) {
    const slug = aliases.get(key);
    if (slug) return slug;
  }
  return null;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/**
 * Turns a Hotel Info result into one offer per provider (PLAN §7.3, task C-014). Pure.
 * - drops items without a positive price, with a currency other than EUR, or without a source
 * - one offer per provider (unknown sources: per domain/name): the cheapest; ads and organic
 *   entries of the same site merge, the URL always comes from an organic entry
 * - per-night prices become stay totals; suspected totals and outliers are kept but not eligible
 */
export function normalizeHotelInfo(
  result: Pick<DfsHotelInfoResult, 'prices'>,
  nights: number,
  aliases: ReadonlyMap<string, string>,
): NormalizeResult {
  if (!Number.isInteger(nights) || nights < 1 || nights > 30) {
    throw new RangeError(`nights must be 1–30, got ${nights}`);
  }
  const dropped: DroppedItem[] = [];
  const groups = new Map<string, { slug: string | null; items: DfsPriceItem[] }>();

  for (const item of result.prices?.items ?? []) {
    if (item.price === null || !Number.isFinite(item.price) || item.price <= 0) {
      dropped.push({ reason: 'no_price', item });
      continue;
    }
    if (item.currency && item.currency !== 'EUR') {
      dropped.push({ reason: 'currency', item });
      continue;
    }
    if (!item.title.trim() && !item.domain) {
      dropped.push({ reason: 'no_source', item });
      continue;
    }
    const slug = resolveProvider(item, aliases);
    const key =
      slug ??
      `unknown:${!isAdDomain(item.domain) && item.domain ? registrableDomain(item.domain) : aliasKey(item.title)}`;
    const group = groups.get(key) ?? { slug, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  const offers: NormalizedOffer[] = [];
  for (const { slug, items } of groups.values()) {
    const cheapest = Math.min(...items.map((i) => i.price as number));
    const organic = items.filter((i) => !i.is_paid && !isAdDomain(i.domain));
    const best =
      organic.find((i) => i.price === cheapest) ??
      items.find((i) => i.price === cheapest) ??
      (items[0] as DfsPriceItem);
    const linkSource = organic.find((i) => i.price === cheapest) ?? organic[0];
    const domain = organic[0]?.domain ?? null;
    const nightlyCents = Math.round(cheapest * 100);
    offers.push({
      providerSlug: slug,
      sourceSlug: slug ?? slugify(domain ? registrableDomain(domain) : best.title),
      sourceName: best.title,
      sourceDomain: domain,
      nightlyCents,
      totalCents: nightlyCents * nights,
      isOfficial: items.some((i) => i.official_site),
      url: linkSource?.url ?? null,
      freeCancellationUntil:
        items.map((i) => i.free_cancellation_until).find((v): v is string => !!v) ?? null,
      suspectedTotal: false,
      outlier: false,
      eligible: true,
      raw: { nightly: true, items },
    });
  }

  const med = median(offers.map((o) => o.nightlyCents));
  if (med !== null) {
    for (const offer of offers) {
      const ratio = offer.nightlyCents / med;
      offer.suspectedTotal =
        nights >= 2 && Math.abs(ratio - nights) <= nights * NORMALIZE.totalTolerance;
      offer.outlier = ratio < NORMALIZE.outlierLow || ratio > NORMALIZE.outlierHigh;
      offer.eligible = !offer.suspectedTotal && !offer.outlier;
    }
  }
  offers.sort((a, b) => a.totalCents - b.totalCents);
  return { offers, dropped, medianNightlyCents: med };
}

/** The cheapest eligible offer: the stay's best price for `stay_daily`. */
export function bestOffer(offers: readonly NormalizedOffer[]): NormalizedOffer | null {
  return offers
    .filter((o) => o.eligible)
    .reduce<NormalizedOffer | null>(
      (best, o) => (best === null || o.totalCents < best.totalCents ? o : best),
      null,
    );
}

export interface UnknownSource {
  slug: string;
  name: string;
  domain: string | null;
}

/**
 * Sources without a provider mapping. The collector creates each as a pending provider
 * (`providers.pending = true`) plus a domain alias, logs it once, and Zaid reviews it in /admin.
 */
export function unknownSources(offers: readonly NormalizedOffer[]): UnknownSource[] {
  const seen = new Map<string, UnknownSource>();
  for (const o of offers) {
    if (o.providerSlug === null && !seen.has(o.sourceSlug)) {
      seen.set(o.sourceSlug, { slug: o.sourceSlug, name: o.sourceName, domain: o.sourceDomain });
    }
  }
  return [...seen.values()];
}
