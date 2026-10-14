import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { LegalPage, type LegalContent } from './LegalPage';

export type LegalKey = 'imprint' | 'privacy' | 'affiliate' | 'ranking' | 'method';

type Props = { params: Promise<{ locale: Locale }> };

/**
 * Builds a static legal page route (C-027) from the `legal.<key>` messages, so each page file is
 * two lines. Texts change only with a deploy, so the pages are prerendered.
 */
export function legalRoute(key: LegalKey, path: string) {
  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal' });
    return {
      title: t(`${key}.metaTitle`),
      description: t(`${key}.metaDescription`),
      alternates: {
        canonical: localizedPath(path, locale),
        languages: { de: localizedPath(path, 'de'), en: localizedPath(path, 'en') },
      },
    };
  }

  async function Page({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    const [t, messages] = await Promise.all([
      getTranslations({ locale, namespace: 'legal' }),
      getMessages({ locale }),
    ]);
    // Whole sections, not single strings: read them from the messages (t.raw's key type
    // gives up on nested arrays of objects).
    const content = messages.legal[key] as LegalContent;
    return (
      <LegalPage
        content={content}
        locale={locale}
        bindingNote={locale === 'de' ? undefined : t('bindingNote')}
      />
    );
  }

  return { generateMetadata, Page };
}
