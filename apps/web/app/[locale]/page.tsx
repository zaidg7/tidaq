import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { Hero } from '@/components/home/Hero';
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
    </>
  );
}
