import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { getCatalog } from '@/lib/data/catalog';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';
import { searchCardProps, searchHotels } from '@/lib/searchCardProps';
import { SearchCard } from './SearchCard';

/** The soft falling hairline under the accent word (CRAFT.md §4.1): the price going down. */
function Hairline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-[0.08em] h-[0.24em] w-full overflow-visible"
    >
      <path
        d="M2 3.5C18 2.5 30 3 44 6.5S72 11 98 9.5"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Homepage hero (DESIGN.md §4, CRAFT.md §5): eyebrow, H1 with the accent word, lead with real
 * numbers from the catalog, and the search card. Lavender blobs fade out behind it.
 */
export async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const [catalog, searchProps] = await Promise.all([getCatalog(), searchCardProps(locale)]);
  const searchList = await searchHotels(catalog?.hotels ?? [], locale);
  const hotels = catalog?.hotels.length ?? 0;
  const cities = catalog?.cityCount ?? 0;

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="hero-blobs" />
      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center px-5 pt-10 pb-12 text-center md:px-7 lg:pt-12 lg:pb-16">
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h1 className="text-display mt-4 max-w-[16ch]">
          {t.rich('title', {
            hi: (chunks) => (
              <span className="relative inline-block text-accent">
                {chunks}
                <Hairline />
              </span>
            ),
          })}
        </h1>
        <p className="text-lead mt-5 max-w-[34em] text-muted-ink">
          {catalog
            ? t.rich('lead', {
                hotels,
                cities,
                link: (chunks) => (
                  <a
                    href={localizedPath(routes.hotels, locale)}
                    className="font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                  >
                    {chunks}
                  </a>
                ),
              })
            : t('leadNoData')}
        </p>
        <div className="mt-8 w-full max-w-[560px] text-left">
          <SearchCard hotels={searchList} today={berlinToday()} locale={locale} {...searchProps} />
        </div>
      </div>
    </section>
  );
}
