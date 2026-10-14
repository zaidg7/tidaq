import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { DealsView } from '@/components/deals/DealsView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getDeals } from '@/lib/data/deals';
import { routes } from '@/lib/routes';

// Prices change every day: render per request.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ stadt?: string | string[] }>;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deals' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    // Filtered views are the same page: one canonical URL.
    alternates: {
      canonical: localizedPath(routes.deals, locale),
      languages: { de: localizedPath(routes.deals, 'de'), en: localizedPath(routes.deals, 'en') },
    },
  };
}

export default async function DealsRoute({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { stadt } = await searchParams;
  const city = typeof stadt === 'string' && SLUG.test(stadt) ? stadt : null;
  const [deals, t, ts] = await Promise.all([
    getDeals(60),
    getTranslations({ locale, namespace: 'deals' }),
    getTranslations({ locale, namespace: 'stay' }),
  ]);
  if (!deals) {
    return (
      <StatusPage eyebrow={ts('unavailableEyebrow')} title={t('pageTitle')} text={t('unavailable')}>
        <a href={localizedPath(routes.deals, locale)} className={buttonClasses({ size: 'lg' })}>
          {ts('retry')}
        </a>
      </StatusPage>
    );
  }
  return <DealsView deals={deals} city={city} />;
}
