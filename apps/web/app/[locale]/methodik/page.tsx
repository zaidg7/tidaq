import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { LegalPage, type LegalContent } from '@/components/legal/LegalPage';
import { legalRoute } from '@/components/legal/legalRoute';
import { MethodLive } from '@/components/provider/MethodLive';
import { getProviderFacts } from '@/lib/data/providers';
import { routes } from '@/lib/routes';

// The live numbers (C-034) change every day: render per request. The text stays in messages.
export const dynamic = 'force-dynamic';

export const generateMetadata = legalRoute('method', routes.method).generateMetadata;

export default async function MethodPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, messages, facts] = await Promise.all([
    getTranslations({ locale, namespace: 'legal' }),
    getMessages({ locale }),
    getProviderFacts(),
  ]);
  return (
    <LegalPage
      content={messages.legal.method as LegalContent}
      locale={locale}
      bindingNote={locale === 'de' ? undefined : t('bindingNote')}
    >
      <MethodLive load={facts} />
    </LegalPage>
  );
}
