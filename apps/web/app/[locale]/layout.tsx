import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { SITE_ORIGIN } from '@tidaq/core';
import { Footer } from '@/components/shell/Footer';
import { Navbar } from '@/components/shell/Navbar';
import { routing } from '@/i18n/routing';
import { jakarta } from '@/lib/fonts';
import { openGraphFor } from '@/lib/og';
import '../globals.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    // Absolute canonical, hreflang and image URLs (C-028a); staging is never indexed anyway.
    metadataBase: new URL(SITE_ORIGIN),
    title: t('title'),
    description: t('description'),
    openGraph: openGraphFor(locale),
    twitter: { card: 'summary_large_image' },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Client components get only the error page copy; everything else renders on the server.
  const { error } = await getMessages();

  return (
    <html lang={locale} className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider messages={{ error }}>
          <Navbar locale={locale} />
          <main id="inhalt" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
