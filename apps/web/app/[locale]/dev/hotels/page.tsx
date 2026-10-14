import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { HotelDirectory } from '@/components/city/HotelDirectory';
import type { DirectoryCity } from '@/lib/data/city';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Sample catalog for `/hotels` (C-024): four regions, the Maldives among them. */
const CITIES: DirectoryCity[] = [
  {
    slug: 'malediven',
    country: 'MV',
    name: { de: 'Malediven', en: 'Maldives' },
    hotels: [{ slug: 'cheval-blanc-randheli-malediven', name: 'Cheval Blanc Randheli' }],
  },
  {
    slug: 'muenchen',
    country: 'DE',
    name: { de: 'München', en: 'Munich' },
    hotels: [{ slug: 'mandarin-oriental-munich', name: 'Mandarin Oriental Munich' }],
  },
  {
    slug: 'berlin',
    country: 'DE',
    name: { de: 'Berlin', en: 'Berlin' },
    hotels: [
      { slug: 'hotel-adlon-kempinski-berlin', name: 'Hotel Adlon Kempinski' },
      { slug: 'the-ritz-carlton-berlin', name: 'The Ritz-Carlton Berlin' },
    ],
  },
  {
    slug: 'wien',
    country: 'AT',
    name: { de: 'Wien', en: 'Vienna' },
    hotels: [{ slug: 'hotel-sacher-wien', name: 'Hotel Sacher Wien' }],
  },
  {
    slug: 'dubai',
    country: 'AE',
    name: { de: 'Dubai', en: 'Dubai' },
    hotels: [{ slug: 'burj-al-arab-dubai', name: 'Burj Al Arab' }],
  },
];

export default async function DevHotelsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <HotelDirectory cities={CITIES} />;
}
