import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';

export default function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <h1 className="text-h2">{t('title')}</h1>
      <p className="text-lead max-w-[30em] text-muted-ink">{t('intro')}</p>
    </div>
  );
}
