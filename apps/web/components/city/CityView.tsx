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
import { HotelPhotoCard } from '@/components/hotel/HotelPhotoCard';
import { PhotoHero } from '@/components/shell/PhotoHero';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';
import type { City, CityHotel } from '@/lib/data/city';
import { cardPhoto } from '@/lib/photos';
import { routes } from '@/lib/routes';

/**
 * City page (C-024, mockup B language): the city's photo full-bleed with "Fünf-Sterne-Hotels in
 * Paris" on it, then its hotels as photo cards, each with its cheapest upcoming week on one site
 * (C-126). The card opens the hotel page (calendar of every night); the week opens its stay page.
 * `children` follow the hotels (the city's Price Drops, the alert band). With `dates` from the
 * search (C-110) the cheapest stays come first; hotels without a total for those dates follow,
 * A–Z. No euro amounts: base rates lack taxes and fees (D-52, C-149).
 */
export function CityView({
  city,
  hotels,
  dates,
  drops = 0,
  children,
}: {
  city: City;
  hotels: CityHotel[];
  dates?: StayParams | null;
  /** Hotels with a Price Drop today, for the line on the photo. */
  drops?: number;
  children?: ReactNode;
}) {
  const t = useTranslations('city');
  const th = useTranslations('home');
  const tp = useTranslations('photo');
  const locale = useLocale() as Locale;
  const where = cityIn(city.slug, city.name[locale], locale);
  const list = dates
    ? [...hotels].sort(
        (a, b) =>
          (a.stay?.totalCents ?? Infinity) - (b.stay?.totalCents ?? Infinity) ||
          a.name.localeCompare(b.name, 'de'),
      )
    : hotels;
  const own = cityPhoto(city.slug);
  // No city photo (Hamburg): the first hotel with its own photo stands in.
  const stand = own ? null : hotels.map((h) => cardPhoto(h.slug, null)).find(Boolean);
  const facts = [
    th('cityHotels', { n: hotels.length }),
    drops > 0 && th('cityDropsToday', { n: drops }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <PhotoHero
        photo={own ? cityPhotoAsHotelPhoto(own) : (stand?.photo ?? null)}
        alt={own?.alt ?? ''}
        tag={own ? undefined : tp('cityTag')}
        eyebrow={
          <a
            href={localizedPath(routes.cities, locale)}
            className="underline-offset-4 hover:underline"
          >
            {t('eyebrowCities')}
          </a>
        }
        title={t('title', { where })}
        lead={
          dates
            ? t('datesLine', {
                dates: formatDateRange(dates.checkIn, dates.checkOut, locale),
                nights: dates.nights,
                adults: dates.adults,
              })
            : hotels.length
              ? facts
              : t('empty')
        }
      >
        {dates && (
          <a
            href={localizedPath(cityPath(city.slug), locale)}
            className="inline-flex min-h-11 items-center text-[16px] font-semibold text-white underline decoration-white/50 underline-offset-[6px] hover:decoration-white"
          >
            {t('withoutDates')}
          </a>
        )}
      </PhotoHero>

      <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-10 md:px-10 md:pt-16">
        {hotels.length > 0 && (
          <section aria-labelledby="city-hotels">
            <div className="mb-6 md:mb-9">
              <h2
                id="city-hotels"
                className="text-[28px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[40px]"
              >
                {t('hotelsTitle')}
              </h2>
              <p className="mt-1.5 max-w-[46em] text-[15px] text-muted md:mt-2.5 md:text-[17px]">
                {dates
                  ? t('datesSorted')
                  : t('intro', { n: hotels.length, where, days: NIGHT_GRID.windowDays })}
              </p>
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7">
              {list.map((h) => (
                <li key={h.slug}>
                  <HotelCard hotel={h} citySlug={city.slug} locale={locale} dates={dates ?? null} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {children}
    </>
  );
}

function HotelCard({
  hotel,
  citySlug,
  locale,
  dates,
}: {
  hotel: CityHotel;
  citySlug: string;
  locale: Locale;
  dates: StayParams | null;
}) {
  const t = useTranslations('city');
  const w = hotel.week;
  const s = hotel.stay;
  return (
    <HotelPhotoCard
      slug={hotel.slug}
      name={hotel.name}
      citySlug={citySlug}
      href={localizedPath(hotelPath(hotel.slug), locale)}
    >
      <div className="mt-3 border-t border-line pt-3">
        {dates ? (
          s ? (
            <>
              <a
                href={localizedPath(
                  stayPath(hotel.slug, dates.checkIn, dates.checkOut, dates.adults),
                  locale,
                )}
                className="relative z-[1] text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                {t('stayLink')}
              </a>
              <p className="mt-0.5 text-[14px] text-muted">
                {t('stayFacts', { nights: dates.nights, provider: s.provider })}
              </p>
            </>
          ) : (
            <p className="text-[14px] text-muted">{t('noStay')}</p>
          )
        ) : w ? (
          <>
            <p className="text-[13px] text-muted">{t('week')}</p>
            {/* Above the card link: the week opens its own stay page. */}
            <a
              href={localizedPath(
                stayPath(hotel.slug, w.checkIn, w.checkOut, NIGHT_GRID.adults),
                locale,
              )}
              className="relative z-[1] mt-0.5 inline-block text-[16px] font-semibold text-accent underline-offset-2 hover:underline"
            >
              {formatDateRange(w.checkIn, w.checkOut, locale)}
            </a>
            <p className="mt-0.5 text-[14px] text-muted">
              {t('weekFacts', { provider: w.provider })}
            </p>
          </>
        ) : (
          <p className="text-[14px] text-muted">{t('noWeek')}</p>
        )}
      </div>
    </HotelPhotoCard>
  );
}
