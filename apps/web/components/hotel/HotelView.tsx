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
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PriceText } from '@/components/ui/PriceText';
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
};

/**
 * Hotel page (C-023a, DESIGN.md §4): hero with photo and facts → cheapest upcoming weekend and
 * midweek stay (C-023b) → price calendar of every night (night grid, D-42) → pick dates → stay
 * page with the history.
 */
export function HotelView({ data, today, now, drops }: Props) {
  const t = useTranslations('hotel');
  const tv = useTranslations('verdict');
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
      : { weekend: null, midweek: null };
  const bestStays = (['weekend', 'midweek'] as const).flatMap((kind) => {
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

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-6 pb-16 md:px-7 lg:pt-10 lg:pb-[88px]">
      <header className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-8">
        <div className="min-w-0 md:order-2">
          {hotel.image ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted 960 px (C-011c) */}
              <img
                src={hotel.image.src}
                alt=""
                width={hotel.image.width}
                height={hotel.image.height}
                decoding="async"
                className="bg-placeholder aspect-[16/10] w-full rounded-card object-cover"
              />
              <figcaption className="mt-1.5 text-[11.5px] text-muted-ink">
                {hotel.image.sourceUrl ? (
                  <a
                    href={hotel.image.sourceUrl}
                    rel="nofollow noopener"
                    className="underline-offset-2 hover:underline"
                  >
                    {t('photoCredit', { credit })}
                  </a>
                ) : (
                  t('photoCredit', { credit })
                )}
              </figcaption>
            </figure>
          ) : (
            <div aria-hidden="true" className="bg-placeholder aspect-[16/10] w-full rounded-card" />
          )}
        </div>
        <div className="min-w-0 md:order-1">
          <p className="text-eyebrow text-accent">
            <a
              href={localizedPath(cityPath(hotel.city.slug), locale)}
              className="underline-offset-2 hover:underline"
            >
              {city}
            </a>
          </p>
          <h1 className="text-title mt-1">{hotel.name}</h1>
          <p className="mt-2 text-[15px] text-muted-ink">{t('facts', { city })}</p>
        </div>
      </header>

      {drops && <div className="mt-6">{drops}</div>}

      {bestStays.length > 0 && (
        <section aria-labelledby="best-title" className="mt-8">
          <h2 id="best-title" className="text-h3">
            {t('bestTitle')}
          </h2>
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
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
        <Card variant="float" radius="search" className="mt-8 lg:p-8">
          <Notice icon={CalendarOff} title={t('inactiveTitle')} text={t('inactiveText')}>
            <a
              href={localizedPath(routes.home, locale)}
              className={buttonClasses({ variant: 'ghost' })}
            >
              {t('home')}
            </a>
          </Notice>
        </Card>
      ) : nights.length === 0 ? (
        <Card variant="float" radius="search" className="mt-8 lg:p-8">
          <Notice
            icon={CalendarClock}
            title={t('emptyTitle')}
            text={t('emptyText', { days: NIGHT_GRID.windowDays })}
          />
        </Card>
      ) : (
        <Card
          variant="float"
          radius="search"
          className="mt-8 lg:p-8"
          aria-labelledby="calendar-title"
          role="region"
        >
          <h2 id="calendar-title" className="text-h3">
            {t('calendarTitle')}
          </h2>
          <p className="text-meta mt-1 mb-4 max-w-[46em] text-muted-ink">{t('calendarText')}</p>
          {nightsUnreliable && (
            <p className="mb-4 rounded-cell bg-warn-soft px-4 py-3 text-[13.5px] font-semibold text-warn-ink">
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
            <p className="text-meta mt-4 text-muted-ink">
              {tv(`updated${updated.day}`, { time: updated.time, date: updated.date })} ·{' '}
              {tv('source')}
            </p>
          )}
        </Card>
      )}
    </div>
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
    <Card interactive className="flex h-full flex-col gap-1.5">
      <p className="text-eyebrow text-accent">
        {t(kind === 'weekend' ? 'bestWeekend' : 'bestMidweek')}
      </p>
      <a
        href={localizedPath(stayPath(slug, stay.checkIn, stay.checkOut, NIGHT_GRID.adults), locale)}
        className="font-bold after:absolute after:inset-0"
      >
        {formatDateRange(stay.checkIn, stay.checkOut, locale)}
      </a>
      <p className="text-meta text-muted-ink">
        {t('bestFacts', { nights: stay.nights, provider })}
      </p>
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-2">
        <PriceText cents={stay.totalCents} locale={locale} size="md" />
        <span className="text-meta text-muted-ink">
          {t('perNight', {
            price: formatPrice(Math.round(stay.totalCents / stay.nights), locale),
          })}
        </span>
      </div>
    </Card>
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
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon icon={icon} size={24} />
      </span>
      <h2 className="text-h3 mt-4">{title}</h2>
      <p className="mt-1 max-w-[34em] text-[15px] text-muted-ink">{text}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
