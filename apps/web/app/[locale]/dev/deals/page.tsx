import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { DealsView } from '@/components/deals/DealsView';
import type { Deal } from '@/lib/data/deals';
import { hotelPhoto } from '@/lib/hotelPhotos';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const deal = (
  stayId: number,
  hotelSlug: string,
  hotelName: string,
  citySlug: string,
  city: [string, string],
  checkIn: string,
  checkOut: string,
  // Sample price kept in the calls for reference; the card shows only the drop (C-149).
  _nowCents: number,
  drop: number,
): Deal => ({
  stayId,
  hotelSlug,
  hotelName,
  citySlug,
  cityName: { de: city[0], en: city[1] },
  checkIn,
  checkOut,
  adults: 2,
  drop,
  imageUrl: hotelPhoto(hotelSlug)?.[960].src ?? null,
});

/** Sample deals (C-025), biggest drop first; `?empty` shows the empty state. */
const DEALS: Deal[] = [
  deal(
    1,
    'baur-au-lac-zuerich',
    'Baur au Lac',
    'zuerich',
    ['Zürich', 'Zurich'],
    '2026-11-20',
    '2026-11-22',
    168_400,
    -0.17,
  ),
  deal(
    2,
    'hotel-adlon-kempinski-berlin',
    'Hotel Adlon Kempinski',
    'berlin',
    ['Berlin', 'Berlin'],
    '2026-12-04',
    '2026-12-06',
    113_800,
    -0.12,
  ),
  deal(
    3,
    'the-ritz-carlton-berlin',
    'The Ritz-Carlton Berlin',
    'berlin',
    ['Berlin', 'Berlin'],
    '2026-11-24',
    '2026-11-26',
    74_600,
    -0.09,
  ),
];

export default async function DevDealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ empty?: string; stadt?: string }>;
}) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const { empty, stadt } = await searchParams;
  return <DealsView deals={empty !== undefined ? [] : DEALS} city={stadt ?? null} />;
}
