import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { alternatesFor, localizedPath, type Locale } from '@tidaq/core';
import { DropAlertSection } from '@/components/drops/DropAlertSection';
import { WeekView } from '@/components/drops/WeekView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getWeek } from '@/lib/data/drops';
import { openGraphFor } from '@/lib/og';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';

// The week moves every day: render per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dropsWeek' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: alternatesFor(routes.dropsWeek, locale),
    openGraph: openGraphFor(locale, { title: t('metaTitle'), description: t('metaDescription') }),
  };
}

export default async function DropsWeekPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const load = await getWeek(berlinToday());
  if (load.kind === 'unavailable') {
    const t = await getTranslations({ locale, namespace: 'dropsWeek' });
    const td = await getTranslations({ locale, namespace: 'drops' });
    return (
      <StatusPage eyebrow={t('eyebrow')} title={t('title')} text={t('unavailable')}>
        <a href={localizedPath(routes.dropsWeek, locale)} className={buttonClasses({ size: 'lg' })}>
          {td('retry')}
        </a>
      </StatusPage>
    );
  }
  return (
    <WeekView
      groups={load.groups}
      summary={load.summary}
      from={load.from}
      to={load.to}
      alert={<DropAlertSection locale={locale} defaultCity={null} />}
    />
  );
}
