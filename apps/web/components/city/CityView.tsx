import { useLocale, useTranslations } from 'next-intl';
import {
  cityIn,
  formatDateRange,
  hotelPath,
  localizedPath,
  NIGHT_GRID,
  stayPath,
  type Locale,
} from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import type { City, CityHotel } from '@/lib/data/city';
import { routes } from '@/lib/routes';

/**
 * City page (C-024): the city's five-star hotels as cards, each with its photo and cheapest
 * upcoming weekend on one site. The card opens the hotel page (calendar of every night); the
 * weekend opens its stay page.
 */
export function CityView({ city, hotels }: { city: City; hotels: CityHotel[] }) {
  const t = useTranslations('city');
  const locale = useLocale() as Locale;
  const where = cityIn(city.slug, city.name[locale], locale);

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
        <p className="text-lead mt-4 text-muted-ink">
          {hotels.length
            ? t('intro', { n: hotels.length, where, days: NIGHT_GRID.windowDays })
            : t('empty')}
        </p>
      </header>
      {hotels.length > 0 && (
        <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((h) => (
            <li key={h.slug}>
              <HotelCard hotel={h} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HotelCard({ hotel, locale }: { hotel: CityHotel; locale: Locale }) {
  const t = useTranslations('city');
  const w = hotel.weekend;
  return (
    <Card interactive padded={false} className="flex h-full flex-col overflow-hidden">
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
      <div className="flex flex-1 flex-col p-5">
        <a
          href={localizedPath(hotelPath(hotel.slug), locale)}
          className="text-h3 after:absolute after:inset-0"
        >
          {hotel.name}
        </a>
        <div className="mt-auto pt-4">
          {w ? (
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
