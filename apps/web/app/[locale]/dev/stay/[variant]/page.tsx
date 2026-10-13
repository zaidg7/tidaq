import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { addDays, type DailyPrice, type Locale } from '@tidaq/core';
import { EditStay } from '@/components/stay/EditStay';
import { StayView, type StayStatus } from '@/components/stay/StayView';
import type { OtherStay, StayHotel } from '@/lib/data/stay';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { sampleSeries } from '@/lib/sampleStay';
import { searchCardProps } from '@/lib/searchCardProps';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const TODAY = '2026-10-13';
const NOW = new Date('2026-10-13T05:40:00Z');
const SLUG = 'hotel-adlon-kempinski-berlin';
const photo = hotelPhoto(SLUG);

const HOTEL: StayHotel = {
  slug: SLUG,
  name: 'Hotel Adlon Kempinski',
  active: true,
  city: { slug: 'berlin', name: { de: 'Berlin', en: 'Berlin' } },
  image: photo
    ? {
        ...photo[160],
        credit: 'Foto: Beispiel, CC BY-SA 4.0, via Wikimedia Commons',
        sourceUrl: null,
      }
    : null,
};

const OTHERS: OtherStay[] = [
  { checkIn: '2026-10-16', checkOut: '2026-10-18', adults: 2, bestCents: 112_400, state: 'good' },
  { checkIn: '2026-10-23', checkOut: '2026-10-25', adults: 2, bestCents: 129_800, state: 'high' },
  {
    checkIn: '2026-10-28',
    checkOut: '2026-10-29',
    adults: 2,
    bestCents: 48_900,
    state: 'collecting',
  },
  { checkIn: '2026-11-06', checkOut: '2026-11-08', adults: 2, bestCents: null, state: null },
];

const VARIANTS: Record<
  string,
  {
    status: StayStatus;
    checkIn: string;
    series: DailyPrice[];
    others: OtherStay[];
    active?: boolean;
  }
> = {
  tracked: {
    status: 'tracked',
    checkIn: '2026-12-04',
    series: sampleSeries(TODAY),
    others: OTHERS,
  },
  // Check-in in 5 days: the advice adds "Kurz vor Anreise …".
  soon: { status: 'tracked', checkIn: addDays(TODAY, 5), series: sampleSeries(TODAY), others: [] },
  collecting: {
    status: 'tracked',
    checkIn: '2026-12-04',
    series: sampleSeries(TODAY).slice(-3),
    others: OTHERS,
  },
  'no-data': { status: 'no_data', checkIn: '2026-12-04', series: [], others: OTHERS },
  untracked: { status: 'untracked', checkIn: '2026-12-05', series: [], others: OTHERS },
  past: { status: 'past', checkIn: '2026-09-04', series: [], others: OTHERS },
  inactive: { status: 'inactive', checkIn: '2026-12-04', series: [], others: [], active: false },
};

/**
 * Every stay page state (C-022a) with made-up data, for screenshots, design review and e2e (CI
 * has no database). Never on production.
 */
export default async function DevStayPage({
  params,
}: {
  params: Promise<{ locale: Locale; variant: string }>;
}) {
  await connection();
  if (process.env.APP_ENV === 'production') notFound();
  const { locale, variant } = await params;
  setRequestLocale(locale);
  const v = VARIANTS[variant];
  if (!v) notFound();
  const checkOut = addDays(v.checkIn, 2);
  const [card, t] = await Promise.all([
    searchCardProps(locale),
    getTranslations({ locale, namespace: 'stay' }),
  ]);

  return (
    <StayView
      hotel={{ ...HOTEL, active: v.active ?? true }}
      params={{ checkIn: v.checkIn, checkOut, nights: 2, adults: 2 }}
      status={v.status}
      series={v.series}
      providerByDay={Object.fromEntries(
        v.series.map((p, i) => [p.day, i % 3 ? 'Booking.com' : 'Hotel Adlon Kempinski']),
      )}
      updatedAt={v.series.length ? '2026-10-13T05:12:00Z' : null}
      others={v.others}
      today={TODAY}
      now={NOW}
      edit={
        <EditStay
          hotels={[{ slug: SLUG, name: HOTEL.name, city: 'Berlin' }]}
          today={TODAY}
          locale={locale}
          guestOptions={card.guestOptions}
          labels={{
            ...card.labels,
            edit: t('edit'),
            close: t('editClose'),
            editTitle: t('editTitle'),
          }}
          initial={{ hotel: SLUG, checkIn: v.checkIn, checkOut, adults: 2 }}
        />
      }
    />
  );
}
