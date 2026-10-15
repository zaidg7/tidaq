import { useLocale, useTranslations } from 'next-intl';
import {
  cityIn,
  cityPath,
  groupByRegion,
  hotelPath,
  hotelWithCity,
  localizedPath,
  type Locale,
} from '@tidaq/core';
import { HotelPhotoCard } from '@/components/hotel/HotelPhotoCard';
import { PageHead } from '@/components/shell/PageHead';
import { Carousel } from '@/components/ui/Carousel';
import type { DirectoryCity } from '@/lib/data/city';
import { routes } from '@/lib/routes';

/**
 * `/hotels` (C-024, mockup B language): every hotel we track as a photo card, by region. The
 * regions are jump links at the top; each region is one carousel of its hotels (three at a time
 * on desktop, C-131), city by city, each named "Hotel, Stadt" unless the name says the city. The
 * region's cities link to their city pages above the carousel.
 */
export function HotelDirectory({ cities }: { cities: DirectoryCity[] }) {
  const t = useTranslations('hotels');
  const locale = useLocale() as Locale;
  const other: Locale = locale === 'de' ? 'en' : 'de';
  const hotelCount = cities.reduce((n, c) => n + c.hotels.length, 0);
  const groups = groupByRegion(
    cities,
    (c) => c.country,
    (c) => c.name[locale],
    locale,
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 pb-16 md:px-10 md:pt-12 md:pb-24">
      <PageHead title={t('title')} lead={t('intro', { hotels: hotelCount, cities: cities.length })}>
        <p className="mt-5 flex flex-wrap gap-2">
          <a
            href={localizedPath(routes.cities, locale)}
            className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white"
          >
            {t('citiesLink')}
          </a>
          {groups.map((g) => (
            <a
              key={g.region}
              href={`#region-${g.region}`}
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-[14px] font-semibold text-ink-2 hover:border-ink/40 hover:text-ink"
            >
              {t(`regions.${g.region}`)}
            </a>
          ))}
        </p>
      </PageHead>
      {groups.map((g) => (
        <section
          key={g.region}
          id={`region-${g.region}`}
          aria-labelledby={`region-${g.region}-title`}
          className="mt-14 scroll-mt-24 md:mt-20"
        >
          <h2
            id={`region-${g.region}-title`}
            className="text-[28px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[40px]"
          >
            {t(`regions.${g.region}`)}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 md:mt-5">
            {g.items.map((c) => (
              <li key={c.slug}>
                <a
                  href={localizedPath(cityPath(c.slug), locale)}
                  className="inline-flex min-h-11 items-baseline gap-1.5 text-[16px] font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline md:min-h-0"
                  aria-label={t('cityLabel', {
                    where: cityIn(c.slug, c.name[locale], locale),
                    n: c.hotels.length,
                  })}
                >
                  {c.name[locale]}
                  <span className="text-[14px] font-normal text-muted">{c.hotels.length}</span>
                </a>
              </li>
            ))}
          </ul>
          <Carousel
            label={t('regionHotels', { region: t(`regions.${g.region}`) })}
            prevLabel={t('prev')}
            nextLabel={t('next')}
            className="mt-5 md:mt-7"
          >
            {g.items.flatMap((c) =>
              c.hotels.map((h) => (
                <HotelPhotoCard
                  key={h.slug}
                  slug={h.slug}
                  name={hotelWithCity(h.name, [c.name[locale], c.name[other]])}
                  citySlug={c.slug}
                  href={localizedPath(hotelPath(h.slug), locale)}
                  sizes="(min-width: 1240px) 390px, (min-width: 768px) 33vw, 78vw"
                  className="[&_h3]:text-[16px] md:[&_h3]:text-[18px]"
                />
              )),
            )}
          </Carousel>
        </section>
      ))}
    </div>
  );
}
