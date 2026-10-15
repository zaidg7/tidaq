import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, jsonLdString, siteJsonLd, type Locale } from '@tidaq/core';
import { Hero } from '@/components/home/Hero';
import { HomeAlert } from '@/components/home/HomeAlert';
import { HomeCities } from '@/components/home/HomeCities';
import { HomeDrops } from '@/components/home/HomeDrops';
import { HomeResult } from '@/components/home/HomeResult';

// Live prices change every morning: render per request (no build-time snapshot).
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternatesFor('/', locale) };
}

/**
 * Homepage (mockup B): photo hero with the search, today's Price Drops, popular cities, what an
 * answer looks like, and the Price Alert. Every section reads real data; one that has nothing to
 * show leaves itself out instead of showing an empty frame.
 */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });
  return (
    <>
      <script
        type="application/ld+json"
        // Escaped by jsonLdString: no `<` can end the script early.
        dangerouslySetInnerHTML={{ __html: jsonLdString(siteJsonLd(t('description'), locale)) }}
      />
      <Hero locale={locale} />
      <HomeDrops locale={locale} />
      <HomeCities locale={locale} />
      <HomeResult locale={locale} />
      <HomeAlert locale={locale} />
    </>
  );
}
