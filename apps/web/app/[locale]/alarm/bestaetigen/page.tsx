import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { routes } from '@/lib/routes';
import { isUuid } from '@/lib/watch/watch';
import { confirmAction } from '../actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ token?: string; ungueltig?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'watch' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * Double opt-in (C-030): the email link opens this page, the button confirms. A GET never
 * confirms, so link scanners in mail programs can't do it for the visitor.
 */
export default async function ConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token = '', ungueltig } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'watch' });
  if (ungueltig !== undefined || !isUuid(token)) {
    return (
      <StatusPage eyebrow={t('confirmEyebrow')} title={t('invalidTitle')} text={t('invalidText')}>
        <a href={localizedPath(routes.home, locale)} className={buttonClasses({ size: 'lg' })}>
          {t('home')}
        </a>
      </StatusPage>
    );
  }
  return (
    <StatusPage eyebrow={t('confirmEyebrow')} title={t('confirmTitle')} text={t('confirmText')}>
      <form action={confirmAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className={buttonClasses({ size: 'lg' })}>
          {t('confirmButton')}
        </button>
      </form>
    </StatusPage>
  );
}
