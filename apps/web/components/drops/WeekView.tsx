import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  dropDates,
  formatDayMonth,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  stayPath,
  type Locale,
  type WeekSummary,
} from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { routes } from '@/lib/routes';
import { dropPercent } from './DropCard';
import { dropsHref } from './DropsTeaser';

/** Hotels in the ranked list. */
export const WEEK_TOP = 10;

/**
 * `/preissturz/woche` (C-080h): the week's drops at a glance. Headline numbers, the top 10 (each
 * hotel's biggest drop of the week, with the day we saw it and a link to the stay's price
 * history, since the price may have moved since), the cities where prices fell most, and the
 * Preissturz-Alarm. A page that is full even on a quiet day, and the weekly social format.
 */
export function WeekView({
  groups,
  summary: s,
  from,
  to,
  alert,
}: {
  groups: HotelDropsWithPhoto[];
  summary: WeekSummary;
  from: string;
  to: string;
  alert?: ReactNode;
}) {
  const t = useTranslations('dropsWeek');
  const td = useTranslations('drops');
  const locale = useLocale() as Locale;
  const top = groups.slice(0, WEEK_TOP);
  const pct = (x: number) => dropPercent(x, locale);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[44em]">
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h1 className="text-h2 mt-2">{t('title')}</h1>
        <p className="text-meta mt-2 text-muted-ink">
          {t('range', { from: formatDayMonth(from, locale), to: formatDayMonth(to, locale) })}
        </p>
      </header>

      {s.drops === 0 ? (
        <Card variant="float" radius="search" className="mt-8 max-w-[44em]">
          <p className="text-[15px]">{t('empty')}</p>
        </Card>
      ) : (
        <>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-semibold">
            <li className="text-[22px] leading-tight font-extrabold">
              {t('statDrops', { n: s.drops })}
            </li>
            <li className="self-end text-muted-ink">{t('statHotels', { n: s.hotels })}</li>
            <li className="self-end text-good-ink">{t('statAverage', { pct: pct(s.average) })}</li>
            <li className="self-end text-good-ink">{t('statBiggest', { pct: pct(s.biggest) })}</li>
            {s.weekends > 0 && (
              <li className="self-end text-muted-ink">{t('statWeekends', { n: s.weekends })}</li>
            )}
          </ul>

          <section aria-labelledby="week-top" className="mt-10">
            <h2 id="week-top" className="text-h3">
              {t('topTitle', { n: top.length })}
            </h2>
            <p className="text-meta mt-1 max-w-[44em] text-muted-ink">{t('topText')}</p>
            <ol className="mt-5 grid gap-3">
              {top.map((g, i) => {
                const d = g.top;
                const thumb = hotelPhoto(g.hotel.slug)?.[160] ?? null;
                return (
                  <li key={g.hotel.id}>
                    <Card
                      interactive
                      padded={false}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-4"
                    >
                      <div className="relative">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
                          <img
                            src={thumb.src}
                            alt=""
                            width={96}
                            height={72}
                            loading="lazy"
                            className="bg-placeholder h-[72px] w-24 rounded-cell object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="bg-placeholder h-[72px] w-24 rounded-cell"
                          />
                        )}
                        <span
                          aria-hidden="true"
                          className="absolute -top-2 -left-2 grid size-7 place-items-center rounded-full bg-fg text-[13px] font-extrabold text-surface"
                        >
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <a
                          href={localizedPath(
                            stayPath(g.hotel.slug, d.night, d.checkOut, 2),
                            locale,
                          )}
                          className="text-[16px] leading-snug font-bold after:absolute after:inset-0"
                        >
                          <span className="sr-only">{i + 1}. </span>
                          {g.hotel.name}
                        </a>
                        <p className="text-meta text-muted-ink">
                          {g.city.name[locale]} ·{' '}
                          {td('night', { date: dropDates(d, locale), n: d.nights })}
                        </p>
                        <p className="text-meta mt-0.5 tabular-nums">
                          <span className="font-semibold">{formatPrice(d.nowCents, locale)}</span>{' '}
                          <span className="text-muted-ink">
                            {td('was', { price: formatPrice(d.prevCents, locale) })} ·{' '}
                            {t('seen', { date: formatWeekdayDayMonth(d.seenDay, locale) })}
                          </span>
                        </p>
                      </div>
                      <span className="col-start-2 justify-self-start rounded-full bg-drop px-3 py-1.5 text-[17px] leading-none font-extrabold text-white tabular-nums sm:col-start-3 sm:justify-self-end">
                        <span aria-hidden="true">{pct(d.drop)}</span>
                        <span className="sr-only">{td('dropLabel', { pct: pct(d.drop) })}</span>
                      </span>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>

          {s.cities.length > 1 && (
            <section aria-labelledby="week-cities" className="mt-14">
              <h2 id="week-cities" className="text-h3">
                {t('citiesTitle')}
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {s.cities.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <a
                      href={dropsHref(locale, c.slug)}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-cell border border-line bg-surface px-4 py-3 hover:border-line-strong"
                    >
                      <span className="font-bold">{c.name[locale]}</span>
                      <span className="text-meta text-muted-ink">
                        {t('cityDrops', { n: c.drops, pct: pct(c.biggest) })}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="mt-10">
        <a
          href={localizedPath(routes.drops, locale)}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('today')}
          <Icon icon={ArrowRight} size={18} />
        </a>
      </p>

      {alert && <div className="mt-10">{alert}</div>}
    </div>
  );
}
