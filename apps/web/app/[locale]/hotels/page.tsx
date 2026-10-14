import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, localizedPath, type Locale } from '@tidaq/core';
import { HotelDirectory } from '@/components/city/HotelDirectory';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getHotelDirectory } from '@/lib/data/city';
import { routes } from '@/lib/routes';

// The catalog changes with migrations, but a fresh read keeps it simple and cheap (one query).
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hotels' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: alternatesFor(routes.hotels, locale),
  };
}

export default async function HotelsRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [cities, t, ts] = await Promise.all([
    getHotelDirectory(),
    getTranslations({ locale, namespace: 'hotels' }),
    getTranslations({ locale, namespace: 'stay' }),
  ]);
  if (!cities) {
    return (
      <StatusPage eyebrow={ts('unavailableEyebrow')} title={t('title')} text={t('unavailable')}>
        <a href={localizedPath(routes.hotels, locale)} className={buttonClasses({ size: 'lg' })}>
          {ts('retry')}
        </a>
      </StatusPage>
    );
  }
  return <HotelDirectory cities={cities} />;
}
