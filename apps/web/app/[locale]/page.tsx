import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { LocaleSwitch } from '@/components/LocaleSwitch';

export default function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p>{t('intro')}</p>
      <LocaleSwitch />
    </main>
  );
}
