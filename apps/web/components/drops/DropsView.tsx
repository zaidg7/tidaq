import { useLocale, useTranslations } from 'next-intl';
import { TrendingDown } from 'lucide-react';
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
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { routes } from '@/lib/routes';
import { DropCard, dropPercent } from './DropCard';

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
}: {
  /** Every hotel with a drop (for the city chips and headline numbers). */
  all: HotelDropsWithPhoto[];
  /** After filters and sorting. */
  shown: HotelDropsWithPhoto[];
  filters: DropFilters;
  seenAt: string | null;
  now: Date;
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

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[44em]">
        <p className="text-eyebrow flex items-center gap-2 text-accent">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-good opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-good" />
          </span>
          {t('eyebrow')}
        </p>
        <h1 className="text-h2 mt-2">{t('title')}</h1>
        <p className="text-lead mt-4 text-muted-ink">{t('intro')}</p>
        {seen && (
          <p className="text-meta mt-3 text-muted-ink">
            {t('asOf', {
              when:
                seen.day === 'today'
                  ? t('today', { time: seen.time })
                  : seen.day === 'yesterday'
                    ? t('yesterday', { time: seen.time })
                    : `${seen.date}, ${seen.time}`,
            })}
          </p>
        )}
      </header>

      {stats.hotels > 0 && (
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-semibold">
          <span>{t('statNights', { n: stats.nights })}</span>
          <span className="text-muted-ink">{t('statHotels', { n: stats.hotels })}</span>
          <span className="text-good-ink">
            {t('statBiggest', { pct: dropPercent(stats.biggest, locale) })}
          </span>
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
        <ul
          aria-label={t('listLabel')}
          className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((g) => (
            <li key={g.hotel.id}>
              <DropCard group={g} />
            </li>
          ))}
        </ul>
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
