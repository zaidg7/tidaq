import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, cityIn, cityPath, localizedPath, type Locale } from '@tidaq/core';
import { CityView } from '@/components/city/CityView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { logView } from '@/lib/data/events';
import { getCityPage } from '@/lib/data/city';
import { openGraphFor } from '@/lib/og';
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
  const title = t('metaTitle', { where });
  const description = t('metaDescription', { where });
  const withPhoto = result.hotels.find((h) => h.image);
  return {
    title,
    description,
    openGraph: openGraphFor(locale, {
      title,
      description,
      photo: withPhoto?.image ?? null,
      alt: withPhoto?.name,
    }),
    alternates: alternatesFor(cityPath(slug), locale),
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
  // Anonymous view count (C-029): which page, never who.
  const userAgent = (await headers()).get('user-agent');
  after(() => logView({ name: 'city_view', props: { city: slug } }, userAgent));
  return <CityView city={result.city} hotels={result.hotels} />;
}
