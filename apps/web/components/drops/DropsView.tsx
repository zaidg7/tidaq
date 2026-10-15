import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BellRing, Check, TrendingDown } from 'lucide-react';
import {
  DROP_SORTS,
  DROP_WHENS,
  dropStats,
  filterDrops,
  sortDrops,
  localizedPath,
  updatedAtParts,
  type DropSort,
  type DropWhen,
  type Locale,
} from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipLink } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { HotelDropsWithPhoto, RadarStats } from '@/lib/data/drops';
import { routes } from '@/lib/routes';
import { DropCard } from './DropCard';
import { DROP_ALERT_ID } from './alertId';
import { DropHero } from './DropHero';

/** Social bio links that land on the radar (`/tiktok` → `/preissturz?ref=tiktok`, C-080d). */
export const DROP_SOURCES = ['tiktok', 'instagram'] as const;
export type DropSource = (typeof DROP_SOURCES)[number];
const SOURCE_NAME: Record<DropSource, string> = { tiktok: 'TikTok', instagram: 'Instagram' };

export interface DropFilters {
  city: string | null;
  when: DropWhen | null;
  sort: DropSort;
}

/** Reads `?stadt=&wann=&sort=`; unknown values fall back to "all" and biggest drop first. */
export function applyDropFilters(
  all: HotelDropsWithPhoto[],
  q: { stadt?: string; wann?: string; sort?: string },
  today: string,
): { filters: DropFilters; shown: HotelDropsWithPhoto[] } {
  const city = q.stadt && all.some((g) => g.city.slug === q.stadt) ? q.stadt : null;
  const when = DROP_WHENS.find((w) => w === q.wann) ?? null;
  const sort = DROP_SORTS.find((s) => s === q.sort) ?? 'pct';
  return {
    filters: { city, when, sort },
    shown: sortDrops(filterDrops(all, { city, when, today }), sort),
  };
}

/**
 * `/preissturz` (C-080a), the Preissturz-Radar: every hotel whose night price fell sharply since
 * the day before to a new low, biggest drop first. City, travel time and sort are URL parameters
 * (`?stadt=paris&wann=week&sort=eur`), so every view can be shared as a link.
 */
export function DropsView({
  all,
  shown,
  filters,
  seenAt,
  now,
  checked = null,
  source = null,
  alert = null,
}: {
  /** Every hotel with a drop (for the city chips and headline numbers). */
  all: HotelDropsWithPhoto[];
  /** After filters and sorting. */
  shown: HotelDropsWithPhoto[];
  filters: DropFilters;
  seenAt: string | null;
  now: Date;
  /** What the night grid checked today: the proof line. */
  checked?: RadarStats | null;
  /** Set when the visitor came through a social bio link: shows the welcome strip. */
  source?: DropSource | null;
  /** The Preissturz-Alarm sign-up (C-080e1), placed after the drops. */
  alert?: ReactNode;
}) {
  const t = useTranslations('drops');
  const locale = useLocale() as Locale;
  const stats = dropStats(all);
  const base = localizedPath(routes.drops, locale);
  const href = (f: Partial<DropFilters>) => {
    const next = { ...filters, ...f };
    const q = new URLSearchParams();
    if (next.city) q.set('stadt', next.city);
    if (next.when) q.set('wann', next.when);
    if (next.sort !== 'pct') q.set('sort', next.sort);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const cities = [...new Map(all.map((g) => [g.city.slug, g.city.name[locale]]))].sort((a, b) =>
    a[1].localeCompare(b[1], locale),
  );
  const filtered = filters.city !== null || filters.when !== null;
  const seen = seenAt ? updatedAtParts(seenAt, now, locale) : null;
  // The biggest drop gets the hero spot on the unfiltered default view and leaves the grid.
  const hero = !filtered && filters.sort === 'pct' ? (shown[0] ?? null) : null;
  const grid = hero ? shown.slice(1) : shown;

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[44em]">
        {source && (
          <p className="mb-4 inline-flex rounded-full bg-accent-soft px-4 py-2 text-[14px] font-semibold text-accent">
            {t('welcome.title', { source: SOURCE_NAME[source] })}
          </p>
        )}
        <p className="text-eyebrow flex items-center gap-2 text-accent">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-good opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-good" />
          </span>
          {t('eyebrow')}
        </p>
        <h1 className="text-h2 mt-2">{t('title')}</h1>
        {/* Visitors from a bio link saw the idea in the video: straight to the drops. */}
        <p className={cn('text-lead mt-3 text-muted-ink', source && 'sr-only')}>{t('intro')}</p>
        {(seen || stats.hotels > 0) && (
          <p className="text-meta mt-2 text-muted-ink">
            {seen &&
              t('asOf', {
                when:
                  seen.day === 'today'
                    ? t('today', { time: seen.time })
                    : seen.day === 'yesterday'
                      ? t('yesterday', { time: seen.time })
                      : `${seen.date}, ${seen.time}`,
              })}
            {seen && stats.hotels > 0 && ' · '}
            {stats.hotels > 0 && (
              <span className="font-semibold text-fg">
                {t('statNights', { n: stats.nights })} {t('statHotels', { n: stats.hotels })}
              </span>
            )}
          </p>
        )}
      </header>

      {hero && (
        <div className="mt-6">
          <DropHero group={hero} />
        </div>
      )}

      {stats.hotels > 0 && (
        <ul
          aria-label={t('welcome.label')}
          className="mt-5 grid gap-x-6 gap-y-1.5 text-[14px] font-semibold sm:flex sm:flex-wrap"
        >
          {checked && (
            <li className="flex gap-2">
              <Icon icon={Check} size={16} className="mt-0.5 shrink-0 text-good-ink" />
              {t('proof', {
                nights: checked.nights,
                hotels: checked.hotels,
                sites: checked.sites,
              })}
            </li>
          )}
          {(['fair', 'free'] as const).map((k) => (
            <li key={k} className="flex gap-2">
              <Icon icon={Check} size={16} className="mt-0.5 shrink-0 text-good-ink" />
              {t(`welcome.${k}`)}
            </li>
          ))}
        </ul>
      )}

      {alert && (
        <p className="mt-4">
          <a
            href={`#${DROP_ALERT_ID}`}
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-accent underline-offset-4 hover:underline"
          >
            <Icon icon={BellRing} size={18} />
            {t('alertCta')}
          </a>
        </p>
      )}

      {stats.hotels > 0 && (
        <div className="mt-8 grid gap-3">
          {cities.length > 1 && (
            <nav aria-label={t('filterCity')}>
              <ul className="flex flex-wrap gap-2">
                <li>
                  <ChipLink href={href({ city: null })} selected={!filters.city}>
                    {t('allCities')}
                  </ChipLink>
                </li>
                {cities.map(([slug, name]) => (
                  <li key={slug}>
                    <ChipLink href={href({ city: slug })} selected={filters.city === slug}>
                      {name}
                    </ChipLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <nav aria-label={t('filterWhen')}>
              <ul className="flex flex-wrap gap-2">
                <li>
                  <ChipLink href={href({ when: null })} selected={!filters.when}>
                    {t('when.all')}
                  </ChipLink>
                </li>
                {DROP_WHENS.map((w) => (
                  <li key={w}>
                    <ChipLink href={href({ when: w })} selected={filters.when === w}>
                      {t(`when.${w}`)}
                    </ChipLink>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t('sortLabel')}>
              <ul className="flex flex-wrap gap-2">
                {DROP_SORTS.map((s) => (
                  <li key={s}>
                    <ChipLink href={href({ sort: s })} selected={filters.sort === s}>
                      {t(`sort.${s}`)}
                    </ChipLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {shown.length > 0 ? (
        grid.length > 0 && (
          <ul
            aria-label={t('listLabel')}
            className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {grid.map((g) => (
              <li key={g.hotel.id}>
                <DropCard group={g} />
              </li>
            ))}
          </ul>
        )
      ) : (
        <Card variant="float" radius="search" className="mt-10 max-w-[44em] lg:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon icon={TrendingDown} size={24} />
          </span>
          <h2 className="text-h3 mt-4">{t('emptyTitle')}</h2>
          <p className="mt-1 text-[15px] text-muted-ink">
            {filtered ? t('emptyFiltered') : t('emptyText')}
          </p>
          <a
            href={filtered ? base : localizedPath(routes.hotels, locale)}
            className={cn(buttonClasses({ variant: 'ghost' }), 'mt-6')}
          >
            {filtered ? t('emptyReset') : t('emptyCta')}
          </a>
        </Card>
      )}

      {alert && <div className="mt-14">{alert}</div>}

      <section aria-labelledby="drops-how" className="mt-14 max-w-[44em]">
        <h2 id="drops-how" className="text-h3">
          {t('howTitle')}
        </h2>
        <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-[15px] leading-relaxed marker:text-muted-ink">
          {(['compare', 'threshold', 'confirm', 'check'] as const).map((k) => (
            <li key={k}>{t(`how.${k}`)}</li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          <a
            href={localizedPath(routes.method, locale)}
            className="font-semibold text-accent underline underline-offset-2 hover:no-underline"
          >
            {t('howLink')}
          </a>
          <a
            href={localizedPath(routes.deals, locale)}
            className="font-semibold text-accent underline underline-offset-2 hover:no-underline"
          >
            {t('dealsLink')}
          </a>
        </p>
      </section>
    </div>
  );
}
