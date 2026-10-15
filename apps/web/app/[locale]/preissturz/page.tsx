import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, localizedPath, type Locale } from '@tidaq/core';
import { headers } from 'next/headers';
import { after } from 'next/server';
import {
  applyDropFilters,
  DROP_SOURCES,
  DropsView,
  type DropSource,
} from '@/components/drops/DropsView';
import { DropAlertSection } from '@/components/drops/DropAlertSection';
import { FromVideos, videoItems } from '@/components/drops/FromVideos';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getDrops, getPosted, getRadarStats } from '@/lib/data/drops';
import { logView } from '@/lib/data/events';
import { openGraphFor } from '@/lib/og';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';

// Drops appear through the day as the night grid runs: render per request.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ stadt?: string; wann?: string; sort?: string; ref?: string }>;
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
  const source = DROP_SOURCES.find((x): x is DropSource => x === q.ref) ?? null;
  // Bio-link visitors also get the drops from our latest posts (C-080j).
  const [load, checked, posted] = await Promise.all([
    getDrops(today),
    getRadarStats(today),
    source ? getPosted(today) : Promise.resolve([]),
  ]);
  // Anonymous count (C-029/C-080d): how many radar views came through which bio link.
  const userAgent = (await headers()).get('user-agent');
  after(() => logView({ name: 'drops_view', props: { ref: source ?? 'none' } }, userAgent));
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
      checked={checked}
      source={source}
      videos={source && <FromVideos items={videoItems(posted, load.drops)} />}
      alert={<DropAlertSection locale={locale} defaultCity={filters.city} />}
    />
  );
}
