import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cityIn, cityPath, localizedPath, type Locale } from '@tidaq/core';
import { CityView } from '@/components/city/CityView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getCityPage } from '@/lib/data/city';
import { berlinToday } from '@/lib/today';

// Weekend prices change every day: render per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale; city: string }> };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// generateMetadata and the page both need the city: one load per request.
const load = cache((slug: string, today: string) => getCityPage(slug, today));

async function resolve({ params }: Props) {
  const { locale, city } = await params;
  if (!SLUG.test(city)) notFound();
  return { locale, slug: city };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await resolve(props);
  const result = await load(slug, berlinToday());
  if (result.kind === 'missing') notFound();
  if (result.kind !== 'ok') return {};
  const t = await getTranslations({ locale, namespace: 'city' });
  const where = cityIn(slug, result.city.name[locale], locale);
  return {
    title: t('metaTitle', { where }),
    description: t('metaDescription', { where }),
    alternates: {
      canonical: localizedPath(cityPath(slug), locale),
      languages: {
        de: localizedPath(cityPath(slug), 'de'),
        en: localizedPath(cityPath(slug), 'en'),
      },
    },
  };
}

export default async function CityPageRoute(props: Props) {
  const { locale, slug } = await resolve(props);
  setRequestLocale(locale);
  const [result, t] = await Promise.all([
    load(slug, berlinToday()),
    getTranslations({ locale, namespace: 'stay' }),
  ]);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') {
    return (
      <StatusPage
        eyebrow={t('unavailableEyebrow')}
        title={t('unavailableTitle')}
        text={t('unavailableText')}
      >
        <a href={localizedPath(cityPath(slug), locale)} className={buttonClasses({ size: 'lg' })}>
          {t('retry')}
        </a>
      </StatusPage>
    );
  }
  return <CityView city={result.city} hotels={result.hotels} />;
}
