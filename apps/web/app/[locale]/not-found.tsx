import { getLocale, getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { routes } from '@/lib/routes';

export async function generateMetadata() {
  const t = await getTranslations('notFound');
  // Next adds noindex to 404 responses itself.
  return { title: t('meta') };
}

/** Branded 404 (CRAFT.md: errors say what happened and what to do). */
export default async function NotFound() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('notFound');
  return (
    <StatusPage eyebrow={t('eyebrow')} title={t('title')} text={t('text')}>
      <a href={localizedPath(routes.home, locale)} className={buttonClasses({ size: 'lg' })}>
        {t('home')}
      </a>
    </StatusPage>
  );
}
