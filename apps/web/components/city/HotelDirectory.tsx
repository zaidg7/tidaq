import { useLocale, useTranslations } from 'next-intl';
import {
  cityIn,
  cityPath,
  groupByRegion,
  hotelPath,
  localizedPath,
  type Locale,
} from '@tidaq/core';
import type { DirectoryCity } from '@/lib/data/city';

/**
 * `/hotels` (C-024): every hotel we track, by region, then city, then name (`/ranking`). Each
 * city links to its city page, each hotel to its hotel page.
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
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[40em]">
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h1 className="text-h2 mt-2">{t('title')}</h1>
        <p className="text-lead mt-4 text-muted-ink">
          {t('intro', { hotels: hotelCount, cities: cities.length })}
        </p>
      </header>
      {groups.map((g) => (
        <section key={g.region} aria-labelledby={`region-${g.region}`} className="mt-12">
          <h2 id={`region-${g.region}`} className="text-h3">
            {t(`regions.${g.region}`)}
          </h2>
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((c) => (
              <li key={c.slug}>
                <a
                  href={localizedPath(cityPath(c.slug), locale)}
                  className="text-[16px] font-bold underline-offset-2 hover:underline"
                  aria-label={t('cityLabel', {
                    where: cityIn(c.slug, c.name[locale], locale),
                    n: c.hotels.length,
                  })}
                >
                  {c.name[locale]}
                </a>
                <ul className="mt-1.5 grid gap-1">
                  {c.hotels.map((h) => (
                    <li key={h.slug}>
                      <a
                        href={localizedPath(hotelPath(h.slug), locale)}
                        className="inline-flex min-h-8 items-center text-[14.5px] text-muted-ink underline-offset-2 hover:text-fg hover:underline"
                      >
                        {h.name}
                      </a>
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
