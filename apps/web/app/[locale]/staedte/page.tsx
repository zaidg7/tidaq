import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, localizedPath, type Locale } from '@tidaq/core';
import { CityDirectory } from '@/components/city/CityDirectory';
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

/** Every city we track, by region (C-134, `CityDirectory`). */
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
  return <CityDirectory cards={cards} />;
}
