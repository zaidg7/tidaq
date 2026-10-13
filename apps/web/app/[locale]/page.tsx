import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { CheckoutTeaser } from '@/components/home/CheckoutTeaser';
import { Deals } from '@/components/home/Deals';
import { FinalCta } from '@/components/home/FinalCta';
import { Hero } from '@/components/home/Hero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { LiveExample } from '@/components/home/LiveExample';

// Live prices change every morning: render per request (no build-time snapshot).
export const dynamic = 'force-dynamic';

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero locale={locale} />
      <LiveExample locale={locale} />
      <HowItWorks locale={locale} />
      <CheckoutTeaser locale={locale} />
      <Deals locale={locale} />
      <FinalCta locale={locale} />
    </>
  );
}
