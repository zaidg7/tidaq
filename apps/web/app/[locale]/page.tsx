import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, jsonLdString, siteJsonLd, type Locale } from '@tidaq/core';
import { CheckoutTeaser } from '@/components/home/CheckoutTeaser';
import { Deals } from '@/components/home/Deals';
import { FinalCta } from '@/components/home/FinalCta';
import { Hero } from '@/components/home/Hero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { LiveExample } from '@/components/home/LiveExample';

// Live prices change every morning: render per request (no build-time snapshot).
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternatesFor('/', locale) };
}

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
      <LiveExample locale={locale} />
      <HowItWorks locale={locale} />
      <CheckoutTeaser locale={locale} />
      <Deals locale={locale} />
      <FinalCta locale={locale} />
    </>
  );
}
