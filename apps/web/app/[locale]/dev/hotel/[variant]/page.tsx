import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { setRequestLocale } from 'next-intl/server';
import { addDays, weekdayMonFirst, type Locale, type NightPrice } from '@tidaq/core';
import { HotelView } from '@/components/hotel/HotelView';
import type { HotelPage } from '@/lib/data/hotel';
import { hotelPhoto } from '@/lib/hotelPhotos';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const TODAY = '2026-10-13';
const NOW = new Date('2026-10-13T09:40:00Z');
const SLUG = 'hotel-adlon-kempinski-berlin';
const photo = hotelPhoto(SLUG);

/**
 * 120 made-up nights: weekends dearer, a cheap week in November, Booking.com (1) and the hotel's
 * own site (8) both price every night except the 10th, where only a pending site (99) has one.
 */
function sampleNights(): NightPrice[] {
  return Array.from({ length: 120 }, (_, i): NightPrice => {
    const night = addDays(TODAY, i);
    const weekend = weekdayMonFirst(night) >= 4 && weekdayMonFirst(night) <= 5;
    const cheapWeek = night >= '2026-11-09' && night <= '2026-11-13';
    const base = 52_000 + (weekend ? 19_000 : 0) - (cheapWeek ? 14_000 : 0) + ((i * 37) % 9) * 900;
    if (i === 9) return { night, bestCents: null, perProvider: { '99': base } };
    return { night, bestCents: base, perProvider: { '1': base, '8': base + 2_400 } };
  });
}

const BASE: HotelPage = {
  hotel: {
    slug: SLUG,
    name: 'Hotel Adlon Kempinski',
    active: true,
    stars: 5,
    city: { slug: 'berlin', country: 'DE', name: { de: 'Berlin', en: 'Berlin' } },
    image: photo
      ? {
          ...photo[960],
          credit: 'Foto: Beispiel, CC BY-SA 4.0, via Wikimedia Commons',
          sourceUrl: null,
        }
      : null,
  },
  nights: sampleNights(),
  updatedAt: '2026-10-13T08:58:00Z',
  providers: [
    { id: 1, name: 'Booking.com', isDirect: false },
    { id: 8, name: 'Hotel direkt', isDirect: true },
  ],
  nightsUnreliable: false,
};

const VARIANTS: Record<string, HotelPage> = {
  calendar: BASE,
  unreliable: { ...BASE, nightsUnreliable: true },
  empty: { ...BASE, nights: [], updatedAt: null },
  inactive: { ...BASE, hotel: { ...BASE.hotel, active: false } },
};

/**
 * Every hotel page state (C-023a) with made-up data, for screenshots, design review and e2e (CI
 * has no database). Never on production.
 */
export default async function DevHotelPage({
  params,
}: {
  params: Promise<{ locale: Locale; variant: string }>;
}) {
  await connection();
  if (process.env.APP_ENV === 'production') notFound();
  const { locale, variant } = await params;
  setRequestLocale(locale);
  const data = VARIANTS[variant];
  if (!data) notFound();
  return <HotelView data={data} today={TODAY} now={NOW} />;
}
