import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarRange, Check, TrendingDown, X } from 'lucide-react';
import {
  DROP_SORTS,
  DROPS,
  dropMonth,
  dropMonths,
  dropStats,
  heroDrop,
  filterDrops,
  formatDrop,
  formatMonth,
  sortDrops,
  localizedPath,
  updatedAtParts,
  type DropSort,
  type Locale,
} from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { HotelDropsWithPhoto, RadarStats } from '@/lib/data/drops';
import { routes } from '@/lib/routes';
import { dropTextClass } from './DropBadge';
import { DropCard } from './DropCard';
import { DropFilterSheet } from './DropFilterSheet';
import { DropHero } from './DropHero';

/** Social bio links that land on the radar (`/tiktok` → `/price-drops?ref=tiktok`, C-080d). */
export const DROP_SOURCES = ['tiktok', 'instagram'] as const;
export type DropSource = (typeof DROP_SOURCES)[number];
const SOURCE_NAME: Record<DropSource, string> = { tiktok: 'TikTok', instagram: 'Instagram' };

export interface DropFilters {
  city: string | null;
  /** Start month, `2026-11` (C-125). */
  month: string | null;
  /** Trip length, 5 or 7 nights (C-125). */
  nights: number | null;
  sort: DropSort;
}

export type DropQuery = { stadt?: string; monat?: string; dauer?: string; sort?: string };

/**
 * Reads `?stadt=&monat=&dauer=&sort=`; unknown values fall back to "all" and biggest drop first.
 * Only months that have a trip on the radar count, so a stale link shows everything.
 */
export function applyDropFilters(
  all: HotelDropsWithPhoto[],
  q: DropQuery,
): { filters: DropFilters; shown: HotelDropsWithPhoto[] } {
  const city = q.stadt && all.some((g) => g.city.slug === q.stadt) ? q.stadt : null;
  const month = q.monat && dropMonths(all).includes(q.monat) ? q.monat : null;
  const nights = DROPS.tripLengths.find((n) => String(n) === q.dauer) ?? null;
  const sort = DROP_SORTS.find((s) => s === q.sort) ?? 'pct';
  return {
    filters: { city, month, nights, sort },
    shown: sortDrops(filterDrops(all, { city, month, nights }), sort),
  };
}

/**
 * `/price-drops` (C-080a), the Preissturz-Radar: every hotel whose price for a 5- or 7-night trip
 * fell sharply since the day before to a new low (C-125), biggest drop first. City, start month,
 * trip length and sort are URL parameters (`?stadt=paris&monat=2026-12&dauer=7&sort=eur`), so
 * every view can be shared as a link.
 */
export function DropsView({
  all,
  shown,
  filters,
  seenAt,
  now,
  today,
  checked = null,
  source = null,
  alert = null,
  videos = null,
}: {
  /** Every hotel with a drop (for the city chips and headline numbers). */
  all: HotelDropsWithPhoto[];
  /** After filters and sorting. */
  shown: HotelDropsWithPhoto[];
  filters: DropFilters;
  seenAt: string | null;
  now: Date;
  /** Berlin day: month chips name the year only when it isn't this one. */
  today: string;
  /** What the night grid checked today: the proof line. */
  checked?: RadarStats | null;
  /** Set when the visitor came through a social bio link: shows the welcome strip. */
  source?: DropSource | null;
  /** The Preissturz-Alarm sign-up (C-080e1), placed after the drops. */
  alert?: ReactNode;
  /** "Aus unseren Videos" for bio-link visitors (C-080j), above the hero. */
  videos?: ReactNode;
}) {
  const t = useTranslations('drops');
  const locale = useLocale() as Locale;
  const stats = dropStats(all);
  const base = localizedPath(routes.drops, locale);
  const href = (f: Partial<DropFilters>) => {
    const next = { ...filters, ...f };
    const q = new URLSearchParams();
    if (next.city) q.set('stadt', next.city);
    if (next.month) q.set('monat', next.month);
    if (next.nights) q.set('dauer', String(next.nights));
    if (next.sort !== 'pct') q.set('sort', next.sort);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const cities = [...new Map(all.map((g) => [g.city.slug, g.city.name[locale]]))].sort((a, b) =>
    a[1].localeCompare(b[1], locale),
  );
  const months = dropMonths(all);
  const filtered = filters.city !== null || filters.month !== null || filters.nights !== null;
  // The chosen filters as removable tags next to the Filter button.
  type Tag = { key: string; label: string; clear: Partial<DropFilters> };
  const tags: Tag[] = [];
  if (filters.city) {
    const name = cities.find(([slug]) => slug === filters.city)?.[1] ?? filters.city;
    tags.push({ key: 'city', label: name, clear: { city: null } });
  }
  if (filters.month) {
    const label = formatMonth(filters.month, locale, today);
    tags.push({ key: 'month', label, clear: { month: null } });
  }
  if (filters.nights) {
    const label = t('nightsChip', { n: filters.nights });
    tags.push({ key: 'nights', label, clear: { nights: null } });
  }
  if (filters.sort !== 'pct') {
    tags.push({ key: 'sort', label: t(`sort.${filters.sort}`), clear: { sort: 'pct' } });
  }
  const seen = seenAt ? updatedAtParts(seenAt, now, locale) : null;
  // The biggest drop with real history gets the hero spot on the unfiltered default view and
  // leaves the grid (C-080d2).
  const hero = !filtered && filters.sort === 'pct' ? heroDrop(shown) : null;
  const grid = hero ? shown.filter((g) => g !== hero) : shown;

  const when = seen
    ? seen.day === 'today'
      ? t('today', { time: seen.time })
      : seen.day === 'yesterday'
        ? t('yesterday', { time: seen.time })
        : `${seen.date}, ${seen.time}`
    : null;

  return (
    <>
      <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 md:px-10 md:pt-12">
        <header className="max-w-[760px]">
          {source && (
            <p className="mb-4 inline-flex rounded-full bg-accent-soft px-4 py-2 text-[14px] font-semibold text-accent">
              {t('welcome.title', { source: SOURCE_NAME[source] })}
            </p>
          )}
          <h1 className="text-[36px] leading-[1.04] font-[650] tracking-[-0.04em] md:text-[60px] md:leading-[1.02]">
            {t('title')}
          </h1>
          {/* Visitors from a bio link saw the idea in the video: straight to the drops. */}
          <p
            className={cn(
              'mt-3 text-[17px] text-muted md:mt-4 md:text-[20px]',
              source && 'sr-only',
            )}
          >
            {t('intro')}
          </p>
          {when && <p className="mt-2 text-[14px] text-muted">{t('asOf', { when })}</p>}
        </header>

        {stats.hotels > 0 && (
          <dl className="mt-7 grid grid-cols-3 gap-3 md:mt-10 md:flex md:gap-14">
            <div>
              <dt className="sr-only">{t('statTripsLabel')}</dt>
              <dd className="text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums md:text-[36px]">
                {stats.trips}
              </dd>
              <dd className="mt-1.5 text-[13px] text-muted md:text-[15px]">
                {t('statTripsShort', { n: stats.trips })}
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t('statHotelsLabel')}</dt>
              <dd className="text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums md:text-[36px]">
                {stats.hotels}
              </dd>
              <dd className="mt-1.5 text-[13px] text-muted md:text-[15px]">
                {t('statHotelsShort', { n: stats.hotels })}
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t('statMaxLabel')}</dt>
              <dd
                className={cn(
                  'text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums md:text-[36px]',
                  dropTextClass(stats.biggest),
                )}
              >
                {formatDrop(stats.biggest, locale)}
              </dd>
              <dd className="mt-1.5 text-[13px] text-muted md:text-[15px]">{t('statMaxShort')}</dd>
            </div>
          </dl>
        )}
        {/* The facts behind the numbers, for readers and tests: one sentence. */}
        {stats.hotels > 0 && (
          <p className="sr-only">
            {t('statTrips', { n: stats.trips })} {t('statHotels', { n: stats.hotels })}
          </p>
        )}

        {videos}

        {hero && (
          <div className="mt-9 md:mt-14">
            <DropHero group={hero} />
          </div>
        )}

        {stats.hotels > 0 && (
          <ul
            aria-label={t('welcome.label')}
            className="mt-8 flex flex-col gap-2 border-y border-line py-4 text-[14px] text-ink-2 md:mt-12 md:flex-row md:flex-wrap md:gap-x-9 md:py-5 md:text-[15px]"
          >
            {checked && (
              <li className="flex gap-2">
                <Icon icon={Check} size={16} className="mt-0.5 shrink-0 text-good" />
                {t('proof', {
                  nights: checked.nights,
                  hotels: checked.hotels,
                  sites: checked.sites,
                })}
              </li>
            )}
            {(['fair', 'free'] as const).map((k) => (
              <li key={k} className="flex gap-2">
                <Icon icon={Check} size={16} className="mt-0.5 shrink-0 text-good" />
                {t(`welcome.${k}`)}
              </li>
            ))}
          </ul>
        )}

        {stats.hotels > 0 && (
          // One decision at a time (Zaid, C-125): a single Filter button holds city, month,
          // length and sort; what's chosen shows as small tags you can remove with one tap.
          <div
            role="group"
            aria-label={t('filterGroup')}
            className="mt-8 flex flex-wrap items-center gap-2 md:mt-12"
          >
            <DropFilterSheet
              base={base}
              current={{
                city: filters.city ?? '',
                month: filters.month ?? '',
                nights: filters.nights ? String(filters.nights) : '',
                sort: filters.sort,
              }}
              facets={all.map((g) => ({
                city: g.city.slug,
                trips: [g.top, ...g.more].map((d) => [dropMonth(d.night), d.nights] as const),
              }))}
              cities={cities.map(([value, label]) => ({ value, label }))}
              months={months.map((m) => ({ value: m, label: formatMonth(m, locale, today) }))}
              nights={[
                { value: '', label: t('nightsAll') },
                ...DROPS.tripLengths.map((n) => ({
                  value: String(n),
                  label: t('nightsChip', { n }),
                })),
              ]}
              sorts={DROP_SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) }))}
              labels={{
                button: t('filterButton'),
                title: t('filterTitle'),
                close: t('filterClose'),
                city: t('filterCity'),
                cityAll: t('allCities'),
                month: t('filterMonth'),
                monthAll: t('monthAll'),
                nights: t('filterNights'),
                sort: t('sortLabel'),
                reset: t('filterReset'),
                showOne: t('filterShowOne'),
                // Raw: the sheet fills in the live count itself.
                showMany: t.raw('filterShowMany') as string,
                showNone: t('filterShowNone'),
              }}
            />
            {tags.map((tag) => (
              <a
                key={tag.key}
                href={href(tag.clear)}
                aria-label={t('filterRemove', { name: tag.label })}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-surface-2 pr-3 pl-4 text-[14px] font-semibold text-ink transition-colors hover:bg-line"
              >
                {tag.label}
                <Icon icon={X} size={16} className="text-muted" />
              </a>
            ))}
            <p className="ml-auto text-[14px] text-muted" aria-live="polite">
              {t('resultCount', { n: shown.length })}
            </p>
          </div>
        )}

        {shown.length > 0 ? (
          grid.length > 0 && (
            <ul
              aria-label={t('listLabel')}
              className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-10 sm:grid-cols-2 md:mt-10 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-14"
            >
              {grid.map((g) => (
                <li key={g.hotel.id}>
                  <DropCard group={g} />
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-panel border border-line bg-surface p-6 md:p-10">
            <span className="grid size-12 place-items-center rounded-full bg-sale-soft text-sale">
              <Icon icon={TrendingDown} size={24} />
            </span>
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]">
                {t('emptyTitle')}
              </h2>
              <p className="mt-1.5 max-w-[40em] text-[15px] text-muted md:text-[16px]">
                {filtered ? t('emptyFiltered') : t('emptyText')}
              </p>
            </div>
            <a
              href={filtered ? base : localizedPath(routes.hotels, locale)}
              className={buttonClasses({ variant: 'secondary' })}
            >
              {filtered ? t('emptyReset') : t('emptyCta')}
            </a>
          </div>
        )}

        <p className="mt-12 md:mt-16">
          <a
            href={localizedPath(routes.dropsWeek, locale)}
            className="group flex items-center justify-between gap-4 rounded-panel bg-surface-accent px-5 py-5 md:px-8 md:py-7"
          >
            <span>
              <span className="flex items-center gap-2 text-[17px] font-semibold md:text-[20px]">
                <Icon icon={CalendarRange} size={20} className="text-accent" />
                {t('weekTitleShort')}
              </span>
              <span className="mt-0.5 block text-[14px] text-muted md:text-[15px]">
                {t('weekLink')}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-accent transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </a>
        </p>
      </div>

      {alert && <div className="mt-14 md:mt-24">{alert}</div>}

      <section
        aria-labelledby="drops-how"
        className="mx-auto w-full max-w-[1240px] px-[18px] pt-14 pb-16 md:px-10 md:pt-24 md:pb-24"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
          <div>
            <h2
              id="drops-how"
              className="text-[26px] leading-[1.12] font-[650] tracking-[-0.03em] md:text-[40px]"
            >
              {t('howTitle')}
            </h2>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
              <a
                href={localizedPath(routes.method, locale)}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {t('howLink')}
              </a>
              <a
                href={localizedPath(routes.deals, locale)}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {t('dealsLink')}
              </a>
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
            {(['compare', 'threshold', 'trip', 'confirm', 'check'] as const).map((k, i) => (
              <li
                key={k}
                className="flex gap-4 bg-surface px-5 py-4 text-[15px] md:px-6 md:text-[16px]"
              >
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-accent text-[13px] font-bold text-accent"
                >
                  {i + 1}
                </span>
                <span>{t(`how.${k}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
