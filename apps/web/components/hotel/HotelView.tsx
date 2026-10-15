import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarClock, CalendarOff } from 'lucide-react';
import {
  cheapestStays,
  cityPath,
  formatDateRange,
  formatPrice,
  localizedPath,
  NIGHT_GRID,
  priceLevels,
  stayPath,
  updatedAtParts,
  type BestStay,
  type BestStayKind,
  type Locale,
} from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { PhotoSheet } from '@/components/shell/PhotoSheet';
import { Icon } from '@/components/ui/Icon';
import { cardPhoto } from '@/lib/photos';
import type { HotelPage } from '@/lib/data/hotel';
import { routes } from '@/lib/routes';
import { PriceCalendar, type CalendarLabels } from './PriceCalendar';

type Props = {
  data: HotelPage;
  /** `YYYY-MM-DD` in German time. */
  today: string;
  /** For the dev page and tests; defaults to the request time. */
  now?: Date;
  /** Today's drops at this hotel (C-080i), right under the header. */
  drops?: ReactNode;
  /** The Preissturz-Alarm for this hotel (C-080k1), after the calendar. */
  alert?: ReactNode;
};

/**
 * Hotel page (C-023a, mockup B language): the hotel's photo with the page on a sheet over it,
 * then the cheapest upcoming 5 nights and week (C-023b, C-125), the price calendar of every night
 * (night grid, D-42) → pick dates → stay page with the history, and the alert for this hotel.
 */
export function HotelView({ data, today, now, drops, alert }: Props) {
  const t = useTranslations('hotel');
  const tv = useTranslations('verdict');
  const tp = useTranslations('photo');
  const locale = useLocale() as Locale;
  const { hotel, nights, updatedAt, providers, nightsUnreliable } = data;
  const city = hotel.city.name[locale];
  const credit = hotel.image?.credit.replace(/^(Foto|Photo):\s*/i, '') ?? '';
  const updated = updatedAt ? updatedAtParts(updatedAt, now ?? new Date(), locale) : null;
  const providerNames = Object.fromEntries(
    providers.map((p) => [String(p.id), p.isDirect ? hotel.name : p.name]),
  );
  // Totals from single nights mislead at unreliable hotels (C-070d): no highlights there.
  const best =
    hotel.active && !nightsUnreliable
      ? cheapestStays(nights, today, new Set(providers.map((p) => p.id)))
      : { trip: null, week: null };
  const bestStays = (['trip', 'week'] as const).flatMap((kind) => {
    const stay = best[kind];
    return stay ? [{ kind, stay }] : [];
  });

  const labels: CalendarLabels = {
    prevMonth: t('prevMonth'),
    nextMonth: t('nextMonth'),
    chooseIn: t('chooseIn'),
    chooseOut: t('chooseOut'),
    clear: t('clear'),
    checkIn: t('checkIn'),
    checkOut: t('checkOut'),
    today: t('today'),
    perNight: t.raw('perNight') as string,
    noPrice: t('noPrice'),
    levels: t('levels').split('|'),
    nightsOne: t('nightsOne'),
    nightsOther: t.raw('nightsOther') as string,
    total: t.raw('total') as string,
    missingOne: t('missingOne'),
    missingOther: t.raw('missingOther') as string,
    none: t('none'),
    unreliable: t('unreliable'),
    show: t('show'),
    legendCheap: t('legendCheap'),
    legendDear: t('legendDear'),
  };

  const pic = cardPhoto(hotel.slug, hotel.city.slug);
  const tag = pic?.city
    ? tp('cityTag')
    : hotel.image &&
      (hotel.image.sourceUrl ? (
        <a
          href={hotel.image.sourceUrl}
          rel="nofollow noopener"
          className="underline-offset-2 hover:underline"
        >
          {t('photoCredit', { credit })}
        </a>
      ) : (
        t('photoCredit', { credit })
      ));

  return (
    <PhotoSheet photo={pic?.photo ?? null} alt={hotel.name} tag={tag}>
      <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-[26px] pb-16 md:px-10 md:pt-10 md:pb-24">
        <header>
          <p className="text-[14px] text-muted md:text-[15px]">
            <a
              href={localizedPath(cityPath(hotel.city.slug), locale)}
              className="underline-offset-2 hover:text-ink hover:underline"
            >
              {city}
            </a>{' '}
            · {t('fiveStars')}
          </p>
          <h1 className="mt-1 text-[30px] leading-[1.12] font-semibold tracking-[-0.03em] md:text-[48px] md:leading-[1.05]">
            {hotel.name}
          </h1>
          <p className="mt-2 max-w-[46em] text-[15px] text-muted md:text-[17px]">
            {t('facts', { city })}
          </p>
        </header>

        {drops && <div className="mt-7 md:mt-10">{drops}</div>}

        {bestStays.length > 0 && (
          <section aria-labelledby="best-title" className="mt-10 md:mt-14">
            <h2
              id="best-title"
              className="text-[22px] font-semibold tracking-[-0.02em] md:text-[28px]"
            >
              {t('bestTitle')}
            </h2>
            <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 md:mt-5 md:gap-5">
              {bestStays.map(({ kind, stay }) => (
                <li key={kind}>
                  <BestStayCard
                    kind={kind}
                    stay={stay}
                    slug={hotel.slug}
                    provider={providerNames[String(stay.providerId)] ?? ''}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {!hotel.active ? (
          <div className="mt-10 rounded-panel border border-line bg-surface p-6 md:p-10">
            <Notice icon={CalendarOff} title={t('inactiveTitle')} text={t('inactiveText')}>
              <a
                href={localizedPath(routes.home, locale)}
                className={buttonClasses({ variant: 'secondary' })}
              >
                {t('home')}
              </a>
            </Notice>
          </div>
        ) : nights.length === 0 ? (
          <div className="mt-10 rounded-panel border border-line bg-surface p-6 md:p-10">
            <Notice
              icon={CalendarClock}
              title={t('emptyTitle')}
              text={t('emptyText', { days: NIGHT_GRID.windowDays })}
            />
          </div>
        ) : (
          <section aria-labelledby="calendar-title" className="mt-10 md:mt-14">
            <h2
              id="calendar-title"
              className="text-[22px] font-semibold tracking-[-0.02em] md:text-[28px]"
            >
              {t('calendarTitle')}
            </h2>
            <p className="mt-1 mb-4 max-w-[46em] text-[15px] text-muted md:mb-5">
              {t('calendarText')}
            </p>
            <div className="rounded-panel border border-[#ece9f1] bg-surface p-4 shadow-[0_16px_40px_rgba(21,19,28,0.06)] md:p-8">
              {nightsUnreliable && (
                <p className="mb-4 rounded-input bg-warn-soft px-4 py-3 text-[14px] font-semibold text-warn">
                  {t('unreliableNote')}
                </p>
              )}
              <PriceCalendar
                slug={hotel.slug}
                nights={nights}
                levels={priceLevels(nights.map((n) => n.bestCents))}
                providers={providerNames}
                nightsUnreliable={nightsUnreliable}
                today={today}
                locale={locale}
                labels={labels}
              />
              {updated && (
                <p className="mt-4 text-[13px] text-muted">
                  {tv(`updated${updated.day}`, { time: updated.time, date: updated.date })} ·{' '}
                  {tv('source')}
                </p>
              )}
            </div>
          </section>
        )}

        {hotel.active && alert && <div className="mt-10 md:mt-14">{alert}</div>}
      </div>
    </PhotoSheet>
  );
}

function BestStayCard({
  kind,
  stay,
  slug,
  provider,
  locale,
}: {
  kind: BestStayKind;
  stay: BestStay;
  slug: string;
  provider: string;
  locale: Locale;
}) {
  const t = useTranslations('hotel');
  return (
    <article className="group relative flex h-full flex-col gap-1 rounded-card border border-[#ece9f1] bg-surface p-5 transition-[border-color,box-shadow] duration-[var(--t-base)] hover:border-line-strong hover:shadow-2 md:p-6">
      <p className="text-[14px] font-semibold text-accent">
        {t(kind === 'trip' ? 'bestTrip' : 'bestWeek')}
      </p>
      <a
        href={localizedPath(stayPath(slug, stay.checkIn, stay.checkOut, NIGHT_GRID.adults), locale)}
        className="text-[19px] font-semibold tracking-[-0.01em] after:absolute after:inset-0 md:text-[21px]"
      >
        {formatDateRange(stay.checkIn, stay.checkOut, locale)}
      </a>
      <p className="text-[14px] text-muted">{t('bestFacts', { nights: stay.nights, provider })}</p>
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-3">
        <strong className="text-[26px] font-bold tracking-[-0.03em] tabular-nums">
          {formatPrice(stay.totalCents, locale)}
        </strong>
        <span className="text-[14px] text-muted">
          {t('perNight', {
            price: formatPrice(Math.round(stay.totalCents / stay.nights), locale),
          })}
        </span>
      </div>
    </article>
  );
}

function Notice({
  icon,
  title,
  text,
  children,
}: {
  icon: typeof CalendarClock;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-full bg-surface-accent text-accent">
        <Icon icon={icon} size={24} />
      </span>
      <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1 max-w-[34em] text-[15px] text-muted">{text}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
