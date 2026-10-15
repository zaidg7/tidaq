import { useLocale, useTranslations } from 'next-intl';
import {
  cityIn,
  cityPath,
  groupByRegion,
  hotelPath,
  localizedPath,
  type Locale,
} from '@tidaq/core';
import { HotelPhotoCard } from '@/components/hotel/HotelPhotoCard';
import { PageHead } from '@/components/shell/PageHead';
import type { DirectoryCity } from '@/lib/data/city';
import { routes } from '@/lib/routes';

/**
 * `/hotels` (C-024, mockup B language): every hotel we track as a photo card, by region, then
 * city, then name (`/ranking`). The regions are jump links at the top; each city is a row with its
 * name (→ city page) and its hotels (→ hotel page).
 */
export function HotelDirectory({ cities }: { cities: DirectoryCity[] }) {
  const t = useTranslations('hotels');
  const locale = useLocale() as Locale;
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
          <ul className="mt-6 flex flex-col gap-10 md:mt-8 md:gap-12">
            {g.items.map((c) => (
              <li key={c.slug}>
                <div className="mb-3.5 flex items-baseline justify-between gap-3 border-b border-line pb-2.5 md:mb-5">
                  <a
                    href={localizedPath(cityPath(c.slug), locale)}
                    className="text-[20px] font-semibold tracking-[-0.02em] underline-offset-4 hover:underline md:text-[22px]"
                    aria-label={t('cityLabel', {
                      where: cityIn(c.slug, c.name[locale], locale),
                      n: c.hotels.length,
                    })}
                  >
                    {c.name[locale]}
                  </a>
                  <span className="text-[14px] text-muted">
                    {t('cityCount', { n: c.hotels.length })}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-6">
                  {c.hotels.map((h) => (
                    <li key={h.slug}>
                      <HotelPhotoCard
                        slug={h.slug}
                        name={h.name}
                        citySlug={c.slug}
                        href={localizedPath(hotelPath(h.slug), locale)}
                        sizes="(min-width: 1240px) 390px, (min-width: 768px) 33vw, 50vw"
                        className="[&_h3]:text-[15px] md:[&_h3]:text-[17px]"
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
