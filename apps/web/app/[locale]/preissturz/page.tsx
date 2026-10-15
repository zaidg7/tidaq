import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, localizedPath, type Locale } from '@tidaq/core';
import { applyDropFilters, DropsView } from '@/components/drops/DropsView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getDrops } from '@/lib/data/drops';
import { openGraphFor } from '@/lib/og';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';

// Drops appear through the day as the night grid runs: render per request.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ stadt?: string; wann?: string; sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'drops' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: alternatesFor(routes.drops, locale),
    openGraph: openGraphFor(locale, { title: t('metaTitle'), description: t('metaDescription') }),
  };
}

export default async function DropsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const today = berlinToday();
  const load = await getDrops(today);
  if (load.kind === 'unavailable') {
    const t = await getTranslations({ locale, namespace: 'drops' });
    return (
      <StatusPage eyebrow={t('eyebrow')} title={t('title')} text={t('unavailable')}>
        <a href={localizedPath(routes.drops, locale)} className={buttonClasses({ size: 'lg' })}>
          {t('retry')}
        </a>
      </StatusPage>
    );
  }
  const { filters, shown } = applyDropFilters(load.drops, q, today);
  return (
    <DropsView
      all={load.drops}
      shown={shown}
      filters={filters}
      seenAt={load.seenAt}
      now={new Date()}
    />
  );
}
