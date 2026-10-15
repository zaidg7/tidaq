import { getTranslations } from 'next-intl/server';
import { cityPath, localizedPath, type Locale } from '@tidaq/core';
import { CityTile } from '@/components/city/CityTile';
import { getCityCards } from '@/lib/data/cityCards';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';
import { cn } from '@/lib/cn';
import { SectionHead } from './SectionHead';

/** One big tile and four small ones: the bento fills exactly two rows of four. */
const SHOWN = 5;

/**
 * "Beliebte Ziele" (mockup B): five cities, those with Price Drops today first. Desktop: a bento
 * grid, the first city 2×2. Phones: a row of 240×300 tiles that snaps as you swipe. Left out
 * without a catalog.
 */
export async function HomeCities({ locale }: { locale: Locale }) {
  const cards = await getCityCards(locale, berlinToday(), 'popular');
  if (!cards || cards.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'home' });
  const shown = cards.slice(0, SHOWN);
  const href = (slug: string) => localizedPath(cityPath(slug), locale);

  return (
    <section
      aria-labelledby="home-cities"
      className="mx-auto w-full max-w-[1240px] pt-16 md:px-10 md:pt-[130px]"
    >
      <div className="px-[14px] md:px-0">
        <SectionHead
          id="home-cities"
          title={t('citiesTitle')}
          link={{
            href: localizedPath(routes.cities, locale),
            long: t('citiesAll', { n: cards.length }),
            short: t('citiesAllShort', { n: cards.length }),
          }}
        />
      </div>
      {/* Phones: swipe row. */}
      <ul className="snap-row flex gap-3 overflow-x-auto px-3.5 pb-1.5 md:hidden">
        {shown.map((c) => (
          <li key={c.slug} className="h-[300px] w-[240px] shrink-0">
            <CityTile city={c} href={href(c.slug)} big sizes="240px" className="size-full" />
          </li>
        ))}
      </ul>
      {/* From 768 px: bento. */}
      <ul className="hidden auto-rows-[200px] grid-cols-4 gap-5 md:grid lg:auto-rows-[260px]">
        {shown.map((c, i) => (
          <li key={c.slug} className={cn(i === 0 && 'col-span-2 row-span-2')}>
            <CityTile
              city={c}
              href={href(c.slug)}
              big={i === 0}
              sizes={
                i === 0 ? '(min-width: 1240px) 590px, 50vw' : '(min-width: 1240px) 290px, 25vw'
              }
              className="size-full"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
