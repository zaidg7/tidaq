import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, cityPath, localizedPath, type Locale } from '@tidaq/core';
import { CityTile } from '@/components/city/CityTile';
import { PageHead } from '@/components/shell/PageHead';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getCityCards } from '@/lib/data/cityCards';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';

// Drop counts change every morning.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cities' });
  const cards = await getCityCards(locale, berlinToday(), 'name');
  const hotels = cards?.reduce((n, c) => n + c.hotels, 0) ?? 0;
  return {
    title: t('metaTitle'),
    description: t('metaDescription', { cities: cards?.length ?? 0, hotels }),
    alternates: alternatesFor(routes.cities, locale),
  };
}

/**
 * Every city we track (mockup B "Alle 27 Städte"): the same photo tiles as on the homepage,
 * A–Z, with hotels and today's Price Drops on each.
 */
export default async function CitiesRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, ts, cards] = await Promise.all([
    getTranslations({ locale, namespace: 'cities' }),
    getTranslations({ locale, namespace: 'stay' }),
    getCityCards(locale, berlinToday(), 'name'),
  ]);
  if (!cards) {
    return (
      <StatusPage eyebrow={ts('unavailableEyebrow')} title={t('title')} text={t('unavailable')}>
        <a href={localizedPath(routes.cities, locale)} className={buttonClasses({ size: 'lg' })}>
          {ts('retry')}
        </a>
      </StatusPage>
    );
  }
  const hotels = cards.reduce((n, c) => n + c.hotels, 0);
  return (
    <div className="mx-auto w-full max-w-[1240px] px-3.5 pt-6 pb-20 md:px-10 md:pt-12 md:pb-32">
      <PageHead
        className="px-1 md:px-0"
        title={t('title')}
        lead={t('lead', { cities: cards.length, hotels })}
      />
      <ul className="mt-7 grid grid-cols-2 gap-3 md:mt-12 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {cards.map((c, i) => (
          <li key={c.slug} className="h-[220px] md:h-[300px]">
            <CityTile
              city={c}
              href={localizedPath(cityPath(c.slug), locale)}
              sizes="(min-width: 1024px) 290px, (min-width: 768px) 33vw, 50vw"
              className="fade-up size-full"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
