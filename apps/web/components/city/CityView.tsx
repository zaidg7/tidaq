import { CityPhotoTag } from '@/components/ui/CityPhotoTag';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  cityIn,
  cityPath,
  formatDateRange,
  hotelPath,
  localizedPath,
  NIGHT_GRID,
  stayPath,
  type Locale,
  type StayParams,
} from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import type { City, CityHotel } from '@/lib/data/city';
import { routes } from '@/lib/routes';

/**
 * City page (C-024): the city's five-star hotels as cards, each with its photo and cheapest
 * upcoming weekend on one site. The card opens the hotel page (calendar of every night); the
 * weekend opens its stay page. `children` follow the list (the city's price drops, C-080a).
 * With `dates` from the search (C-110) every card shows that stay's total and the cheapest come
 * first; hotels without a total for those dates follow, A–Z.
 */
export function CityView({
  city,
  hotels,
  dates,
  children,
}: {
  city: City;
  hotels: CityHotel[];
  dates?: StayParams | null;
  children?: ReactNode;
}) {
  const t = useTranslations('city');
  const locale = useLocale() as Locale;
  const where = cityIn(city.slug, city.name[locale], locale);
  const list = dates
    ? [...hotels].sort(
        (a, b) =>
          (a.stay?.totalCents ?? Infinity) - (b.stay?.totalCents ?? Infinity) ||
          a.name.localeCompare(b.name, 'de'),
      )
    : hotels;

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[40em]">
        <p className="text-eyebrow text-accent">
          <a
            href={localizedPath(routes.hotels, locale)}
            className="underline-offset-2 hover:underline"
          >
            {t('eyebrow')}
          </a>
        </p>
        <h1 className="text-h2 mt-2">{t('title', { where })}</h1>
        {dates ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-lead font-semibold text-ink">
              {t('datesLine', {
                dates: formatDateRange(dates.checkIn, dates.checkOut, locale),
                nights: dates.nights,
                adults: dates.adults,
              })}
            </p>
            <a
              href={localizedPath(cityPath(city.slug), locale)}
              className="text-small font-semibold text-accent underline-offset-2 hover:underline"
            >
              {t('withoutDates')}
            </a>
          </div>
        ) : (
          <p className="text-lead mt-4 text-muted-ink">
            {hotels.length
              ? t('intro', { n: hotels.length, where, days: NIGHT_GRID.windowDays })
              : t('empty')}
          </p>
        )}
        {dates && hotels.length > 0 && (
          <p className="text-small mt-2 text-muted-ink">{t('datesSorted')}</p>
        )}
      </header>
      {hotels.length > 0 && (
        <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((h) => (
            <li key={h.slug}>
              <HotelCard hotel={h} locale={locale} dates={dates ?? null} />
            </li>
          ))}
        </ul>
      )}
      {children && <div className="mt-14 lg:mt-[88px]">{children}</div>}
    </div>
  );
}

function HotelCard({
  hotel,
  locale,
  dates,
}: {
  hotel: CityHotel;
  locale: Locale;
  dates: StayParams | null;
}) {
  const t = useTranslations('city');
  const w = hotel.weekend;
  const s = hotel.stay;
  return (
    <Card interactive padded={false} className="flex h-full flex-col overflow-hidden">
      <div className="relative">
        {hotel.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted 960 px (C-011c)
          <img
            src={hotel.image.src}
            alt=""
            width={hotel.image.width}
            height={hotel.image.height}
            loading="lazy"
            decoding="async"
            className="bg-placeholder aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="bg-placeholder aspect-[16/10] w-full" />
        )}
        <CityPhotoTag image={hotel.image} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <a
          href={localizedPath(hotelPath(hotel.slug), locale)}
          className="text-h3 after:absolute after:inset-0"
        >
          {hotel.name}
        </a>
        <div className="mt-auto pt-4">
          {dates ? (
            s ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <a
                    href={localizedPath(
                      stayPath(hotel.slug, dates.checkIn, dates.checkOut, dates.adults),
                      locale,
                    )}
                    className="relative z-[1] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    {t('stayLink')}
                  </a>
                  <PriceText cents={s.totalCents} locale={locale} size="md" />
                </div>
                <p className="text-meta mt-0.5 text-muted-ink">
                  {t('stayFacts', { nights: dates.nights, provider: s.provider })}
                </p>
              </>
            ) : (
              <p className="text-meta text-muted-ink">{t('noStay')}</p>
            )
          ) : w ? (
            <>
              <p className="text-meta text-muted-ink">{t('weekend')}</p>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                {/* Above the card link: the weekend opens its own stay page. */}
                <a
                  href={localizedPath(
                    stayPath(hotel.slug, w.checkIn, w.checkOut, NIGHT_GRID.adults),
                    locale,
                  )}
                  className="relative z-[1] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {formatDateRange(w.checkIn, w.checkOut, locale)}
                </a>
                <PriceText cents={w.totalCents} locale={locale} size="md" />
              </div>
              <p className="text-meta mt-0.5 text-muted-ink">
                {t('weekendFacts', { provider: w.provider })}
              </p>
            </>
          ) : (
            <p className="text-meta text-muted-ink">{t('noWeekend')}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
