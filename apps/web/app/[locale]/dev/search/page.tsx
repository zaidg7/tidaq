import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { SearchBar } from '@/components/search/SearchBar';
import { sampleDrops } from '@/lib/dropsSample';
import { searchBarProps } from '@/lib/searchCardProps';
import { searchIndex } from '@/lib/searchIndex';
import { SEARCH_SAMPLE } from '@/lib/searchSample';
import { berlinToday } from '@/lib/today';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The search (C-107 onward) with a sample catalog and today's sample drops. */
export default async function DevSearchPage({ params }: { params: Promise<{ locale: Locale }> }) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const index = searchIndex(SEARCH_SAMPLE, sampleDrops(), locale);
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pt-16 pb-[420px] md:px-6 lg:px-10">
      <h1 className="text-h1 text-center">Suche</h1>
      <div className="mx-auto mt-10 max-w-[880px]">
        <SearchBar
          index={index}
          today={berlinToday()}
          locale={locale}
          {...await searchBarProps(locale)}
        />
      </div>
    </div>
  );
}
