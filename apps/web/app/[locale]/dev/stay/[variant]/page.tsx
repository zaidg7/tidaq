import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { addDays, type DailyPrice, type Locale, type StayOffer } from '@tidaq/core';
import { EditStay } from '@/components/stay/EditStay';
import { StayView, type StayStatus } from '@/components/stay/StayView';
import type { OtherStay, StayHotel } from '@/lib/data/stay';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { sampleSeries } from '@/lib/sampleStay';
import { searchCardProps } from '@/lib/searchCardProps';
import { DropCallout } from '@/components/drops/DropCallout';
import { sampleDrops } from '@/lib/dropsSample';

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

/**
 * Today's prices by provider around the latest best price: the hotel site is cheapest, Expedia
 * lists less than Booking.com but its tests show a markup, so it drops behind (PLAN §8.3).
 */
function sampleOffers(series: DailyPrice[]): StayOffer[] {
  const best = series.at(-1)?.bestCents;
  if (!best) return [];
  const at = (pct: number) => Math.round((best * (1 + pct / 100)) / 100) * 100;
  const trust = (score: number, tests: number, matches: number, avgMarkupPct: number) => ({
    score,
    tests,
    matches,
    avgMarkupPct,
  });
  return [
    {
      providerId: 1,
      name: 'Booking.com',
      isDirect: false,
      slug: 'booking-com',
      link: { slug: 'booking-com', partner: false },
      totalCents: at(2.5),
      trust: trust(96, 25, 24, 0.4),
    },
    {
      providerId: 2,
      name: 'Expedia',
      isDirect: false,
      slug: 'expedia',
      link: { slug: 'expedia', partner: false },
      totalCents: at(1),
      trust: trust(58, 12, 7, 8.9),
    },
    {
      providerId: 3,
      name: 'Hotel Adlon Kempinski',
      isDirect: true,
      slug: 'hotel-direct',
      link: { slug: 'hotel-direct', partner: false },
      totalCents: best,
      trust: trust(100, 6, 6, 0),
    },
    {
      providerId: 4,
      name: 'Trip.com',
      isDirect: false,
      slug: 'trip-com',
      link: { slug: 'trip-com', partner: false },
      totalCents: at(4),
      trust: null,
    },
    {
      providerId: 5,
      name: 'Agoda',
      isDirect: false,
      link: { slug: 'agoda', partner: false },
      totalCents: at(6),
      trust: trust(67, 3, 2, 2.1),
    },
  ];
}

const VARIANTS: Record<
  string,
  {
    status: StayStatus;
    checkIn: string;
    series: DailyPrice[];
    others: OtherStay[];
    active?: boolean;
    /** Day of the provider prices when not today ("Preise vom …"). */
    offersDay?: string;
    /** Where the history comes from (C-070b); tracked variants default to `stay`. */
    history?: 'nights' | 'stay';
    realVsNights?: { realCents: number; nightsCents: number };
    /** Single nights mislead at this hotel (C-070d). */
    nightsUnreliable?: boolean;
    adults?: number;
  }
> = {
  tracked: {
    status: 'tracked',
    checkIn: '2026-12-04',
    series: sampleSeries(TODAY),
    others: OTHERS,
  },
  // Check-in in 5 days: the advice adds "Kurz vor Anreise …".
  soon: {
    status: 'tracked',
    checkIn: addDays(TODAY, 5),
    series: sampleSeries(TODAY),
    others: [],
    offersDay: addDays(TODAY, -1),
  },
  collecting: {
    status: 'tracked',
    checkIn: '2026-12-04',
    series: sampleSeries(TODAY).slice(-3),
    others: OTHERS,
  },
  'no-data': { status: 'no_data', checkIn: '2026-12-04', series: [], others: OTHERS },
  // History from the night grid; today's real check is 31 % below the nights' sum (C-070b).
  nights: {
    status: 'tracked',
    checkIn: '2026-12-04',
    series: sampleSeries(TODAY),
    others: OTHERS,
    history: 'nights',
    realVsNights: { realCents: 154_400, nightsCents: 224_400 },
  },
  // Beyond the 120-day night grid.
  untracked: { status: 'untracked', checkIn: '2027-03-05', series: [], others: OTHERS },
  // 3 adults: the night grid collects 2.
  'untracked-guests': {
    status: 'untracked',
    checkIn: '2026-12-05',
    series: [],
    others: OTHERS,
    adults: 3,
  },
  // C-070d: single nights mislead here, so only real checks of the exact stay count.
  'real-only': {
    status: 'untracked',
    checkIn: '2026-12-04',
    series: [],
    others: OTHERS,
    nightsUnreliable: true,
  },
  'real-only-history': {
    status: 'tracked',
    checkIn: '2026-12-04',
    series: sampleSeries(TODAY).slice(-9),
    others: OTHERS,
    nightsUnreliable: true,
  },
  past: { status: 'past', checkIn: '2026-09-04', series: [], others: OTHERS },
  inactive: { status: 'inactive', checkIn: '2026-12-04', series: [], others: [], active: false },
};

/**
 * Every stay page state (C-022a) with made-up data, for screenshots, design review and e2e (CI
 * has no database). Never on production.
 */
export default async function DevStayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; variant: string }>;
  searchParams: Promise<{ drop?: string }>;
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

  // `?drop`: the drop callout (C-080i) with a sample drop.
  const drop = (await searchParams).drop !== undefined ? sampleDrops()[0] : undefined;
  return (
    <StayView
      drop={drop && <DropCallout group={drop} drop={drop.top} />}
      hotel={{ ...HOTEL, active: v.active ?? true }}
      params={{ checkIn: v.checkIn, checkOut, nights: 2, adults: v.adults ?? 2 }}
      status={v.status}
      series={v.series}
      providerByDay={Object.fromEntries(
        v.series.map((p, i) => [p.day, i % 3 ? 'Booking.com' : 'Hotel Adlon Kempinski']),
      )}
      updatedAt={v.series.length ? '2026-10-13T05:12:00Z' : null}
      history={v.series.length ? (v.history ?? 'stay') : null}
      realVsNights={v.realVsNights ?? null}
      nightsUnreliable={v.nightsUnreliable ?? false}
      others={v.others}
      offers={{
        day: v.series.length ? (v.offersDay ?? TODAY) : null,
        list: sampleOffers(v.series),
        unreviewed: v.series.length ? 2 : 0,
      }}
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
          initial={{ hotel: SLUG, checkIn: v.checkIn, checkOut, adults: v.adults ?? 2 }}
        />
      }
    />
  );
}
