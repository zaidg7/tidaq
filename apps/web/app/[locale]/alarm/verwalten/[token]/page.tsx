import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { ManageView } from '@/components/watch/ManageView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { routes } from '@/lib/routes';
import { getManage, isUuid } from '@/lib/watch/watch';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'watch' });
  // The token in the URL is a key: never indexed, never sent as referrer.
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/** Manage page (C-030): the visitor's alerts, stop one, or unsubscribe completely. No login. */
export default async function ManagePage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const t = await getTranslations({ locale, namespace: 'watch' });
  const home = (
    <a href={localizedPath(routes.home, locale)} className={buttonClasses({ size: 'lg' })}>
      {t('home')}
    </a>
  );
  if (q.abgemeldet !== undefined) {
    return (
      <StatusPage
        eyebrow={t('manageEyebrow')}
        title={t('unsubscribedTitle')}
        text={t('unsubscribedText')}
      >
        {home}
      </StatusPage>
    );
  }
  const data = isUuid(token) ? await getManage(token).catch(() => null) : null;
  if (!data) {
    return (
      <StatusPage eyebrow={t('manageEyebrow')} title={t('notFoundTitle')} text={t('notFoundText')}>
        {home}
      </StatusPage>
    );
  }
  const notice =
    q.bestaetigt !== undefined
      ? t('confirmedNotice')
      : q.beendet !== undefined
        ? t('removed')
        : q.fehler !== undefined
          ? t('error')
          : null;
  return <ManageView data={data} token={token} notice={notice} />;
}
