import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { CityView } from '@/components/city/CityView';
import type { CityHotel } from '@/lib/data/city';
import { hotelPhoto } from '@/lib/hotelPhotos';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const photo = (slug: string) => hotelPhoto(slug)?.[960] ?? null;

/** Sample Berlin (C-024): a weekend price, a hotel without one, a hotel without a photo. */
const HOTELS: CityHotel[] = [
  {
    slug: 'hotel-adlon-kempinski-berlin',
    name: 'Hotel Adlon Kempinski',
    image: photo('hotel-adlon-kempinski-berlin'),
    weekend: {
      checkIn: '2026-11-13',
      checkOut: '2026-11-15',
      totalCents: 136_100,
      provider: 'Booking.com',
    },
  },
  {
    slug: 'the-ritz-carlton-berlin',
    name: 'The Ritz-Carlton Berlin',
    image: photo('the-ritz-carlton-berlin'),
    weekend: null,
  },
  { slug: 'waldorf-astoria-berlin', name: 'Waldorf Astoria Berlin', image: null, weekend: null },
];

export default async function DevCityPage({ params }: { params: Promise<{ locale: Locale }> }) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <CityView
      city={{ slug: 'berlin', country: 'DE', name: { de: 'Berlin', en: 'Berlin' } }}
      hotels={HOTELS}
    />
  );
}
