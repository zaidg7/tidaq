import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarRange } from 'lucide-react';
import {
  dropDates,
  formatDayMonth,
  formatWeekdayDayMonth,
  localizedPath,
  stayPath,
  type Locale,
  type WeekSummary,
} from '@tidaq/core';
import { PageHead } from '@/components/shell/PageHead';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cardPhoto } from '@/lib/photos';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/cn';
import { DropBadge, dropTextClass } from './DropBadge';
import { dropPercent } from './DropCard';
import { dropsHref } from './DropsTeaser';

/** Hotels in the ranked list. */
export const WEEK_TOP = 10;

/**
 * `/price-drops/woche` (C-080h): the week's drops at a glance. Headline numbers, the top 10 (each
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

  /** `drop`: a drop share, printed in its red step (D-46). */
  const stat = (value: string, label: string, drop?: number) => (
    <div>
      <dd
        className={cn(
          'text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums md:text-[36px]',
          drop !== undefined && dropTextClass(drop),
        )}
      >
        {value}
      </dd>
      <dt className="mt-1.5 text-[13px] text-muted md:text-[15px]">{label}</dt>
    </div>
  );

  return (
    <>
      <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 md:px-10 md:pt-12">
        <PageHead
          pill={
            <>
              <Icon icon={CalendarRange} size={16} className="text-accent" />
              {t('eyebrow')} ·{' '}
              {t('range', { from: formatDayMonth(from, locale), to: formatDayMonth(to, locale) })}
            </>
          }
          title={t('title')}
        />

        {s.drops === 0 ? (
          <div className="mt-8 max-w-[44em] rounded-panel border border-line bg-surface p-6 md:p-8">
            <p className="text-[16px]">{t('empty')}</p>
          </div>
        ) : (
          <>
            {/* The numbers as one sentence for readers; the big figures below are decoration. */}
            <p className="sr-only">
              {t('statDrops', { n: s.drops })} {t('statHotels', { n: s.hotels })}{' '}
              {t('statAverage', { pct: pct(s.average) })}{' '}
              {t('statBiggest', { pct: pct(s.biggest) })}
            </p>
            <dl
              aria-hidden="true"
              className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 md:mt-10 md:flex md:gap-14"
            >
              {stat(String(s.drops), t('statDropsShort', { n: s.drops }))}
              {stat(String(s.hotels), t('statHotelsShort', { n: s.hotels }))}
              {stat(pct(s.average), t('statAverageShort'), s.average)}
              {stat(pct(s.biggest), t('statBiggestShort'), s.biggest)}
            </dl>

            <section aria-labelledby="week-top" className="mt-12 md:mt-16">
              <h2
                id="week-top"
                className="text-[28px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[40px]"
              >
                {t('topTitle', { n: top.length })}
              </h2>
              <p className="mt-1.5 max-w-[46em] text-[15px] text-muted md:mt-2.5 md:text-[17px]">
                {t('topText')}
              </p>
              <ol className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-x-6 md:gap-y-4">
                {top.map((g, i) => {
                  const d = g.top;
                  const pic = cardPhoto(g.hotel.slug, g.city.slug);
                  return (
                    <li key={g.hotel.id}>
                      <article className="tile-zoom group relative flex items-center gap-3.5 rounded-card border border-[#ece9f1] bg-surface p-3 transition-[border-color,box-shadow] duration-[var(--t-base)] hover:border-line-strong hover:shadow-2 md:gap-4 md:p-3.5">
                        <div className="relative shrink-0">
                          <Photo
                            photo={pic?.photo ?? null}
                            alt=""
                            sizes="120px"
                            className="h-[84px] w-[104px] rounded-[14px] md:h-[96px] md:w-[124px]"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -top-2 -left-2 grid size-8 place-items-center rounded-full border-2 border-surface bg-ink text-[13px] font-bold text-white"
                          >
                            {i + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={localizedPath(
                              stayPath(g.hotel.slug, d.night, d.checkOut, 2),
                              locale,
                            )}
                            className="line-clamp-2 text-[16px] leading-snug font-semibold after:absolute after:inset-0 group-hover:text-accent"
                          >
                            <span className="sr-only">{i + 1}. </span>
                            {g.hotel.name}
                          </a>
                          <p className="mt-0.5 truncate text-[13.5px] text-muted">
                            {g.city.name[locale]} ·{' '}
                            {td('night', { date: dropDates(d, locale), n: d.nights })}
                          </p>
                          {/* Past drops were never quoted: no amounts, only the day (D-52). */}
                          <p className="mt-1 text-[13.5px] text-muted">
                            {t('seen', { date: formatWeekdayDayMonth(d.seenDay, locale) })}
                          </p>
                        </div>
                        <DropBadge
                          drop={d.drop}
                          locale={locale}
                          label={td('dropLabel', { pct: pct(d.drop) })}
                          size="sm"
                          className="drop-badge-outline shrink-0 self-start"
                        />
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>

            {s.cities.length > 1 && (
              <section aria-labelledby="week-cities" className="mt-14 md:mt-20">
                <h2
                  id="week-cities"
                  className="text-[28px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[40px]"
                >
                  {t('citiesTitle')}
                </h2>
                <ul className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
                  {s.cities.slice(0, 6).map((c) => {
                    const photo = cityPhoto(c.slug);
                    return (
                      <li key={c.slug} className="h-[180px] md:h-[220px]">
                        <a
                          href={dropsHref(locale, c.slug)}
                          className="tile-zoom relative block size-full overflow-hidden rounded-card bg-[#2a2620] text-white"
                        >
                          <Photo
                            photo={photo ? cityPhotoAsHotelPhoto(photo) : null}
                            alt=""
                            sizes="(min-width: 768px) 33vw, 50vw"
                            className="size-full"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,12,18,0)_35%,rgba(14,12,18,0.75)_100%)]"
                            />
                          </Photo>
                          <span className="absolute bottom-4 left-4 right-4 flex flex-col md:bottom-5 md:left-5">
                            <span className="text-[20px] leading-tight font-[650] tracking-[-0.02em] md:text-[24px]">
                              {c.name[locale]}
                            </span>
                            <span className="mt-0.5 text-[13px] text-white/88 md:text-[14px]">
                              {t('cityDrops', { n: c.drops, pct: pct(c.biggest) })}
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        <p className="mt-12 md:mt-16">
          <a
            href={localizedPath(routes.drops, locale)}
            className="group flex items-center justify-between gap-4 rounded-panel bg-surface-accent px-5 py-5 text-[17px] font-semibold md:px-8 md:py-7 md:text-[20px]"
          >
            {t('today')}
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-accent transition-transform group-hover:translate-x-0.5"
            >
              <Icon icon={ArrowRight} size={18} />
            </span>
          </a>
        </p>
      </div>

      {alert && <div className="mt-14 md:mt-24">{alert}</div>}
    </>
  );
}
