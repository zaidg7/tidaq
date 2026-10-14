import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale, ProviderFact, ProviderFacts } from '@tidaq/core';
import { MethodLive } from '@/components/provider/MethodLive';
import { ProviderView } from '@/components/provider/ProviderView';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const base: ProviderFact = {
  slug: 'agoda',
  name: 'Agoda',
  is_direct: false,
  hotels: 78,
  nights: 8643,
  compared: 8624,
  cheapest: 6181,
  median_gap_pct: 4,
  tests: 0,
  matches: 0,
  higher: 0,
  lower: 0,
  unavailable: 0,
  avg_markup_pct: null,
  score: null,
  extras: {},
  first_test: null,
  last_test: null,
};

/**
 * Sample data (C-034): Booking.com with 12 tests (score, extras), Trip.com with 3 tests (no
 * score yet), Agoda untested, Expedia tested but without grid prices, the direct channel.
 */
const PROVIDERS: ProviderFact[] = [
  {
    ...base,
    slug: 'booking-com',
    name: 'Booking.com',
    hotels: 76,
    nights: 8552,
    compared: 8548,
    cheapest: 3576,
    median_gap_pct: 6.6,
    tests: 12,
    matches: 9,
    higher: 2,
    lower: 0,
    unavailable: 1,
    avg_markup_pct: 2.4,
    score: 78,
    extras: { city_tax: 2, fees: 1 },
    first_test: '2026-10-16',
    last_test: '2026-11-02',
  },
  {
    ...base,
    slug: 'trip-com',
    name: 'Trip.com',
    nights: 8574,
    cheapest: 2374,
    compared: 8462,
    median_gap_pct: 6.3,
    tests: 3,
    matches: 3,
    avg_markup_pct: 0,
    score: 81,
    first_test: '2026-10-20',
    last_test: '2026-10-20',
  },
  base,
  {
    ...base,
    slug: 'expedia',
    name: 'Expedia',
    hotels: 0,
    nights: 0,
    compared: 0,
    cheapest: 0,
    median_gap_pct: null,
    tests: 1,
    higher: 1,
    avg_markup_pct: 8.2,
    score: 63,
    extras: { breakfast_missing: 1 },
    first_test: '2026-10-21',
    last_test: '2026-10-21',
  },
  {
    ...base,
    slug: 'hotel-direct',
    name: 'Hotel direkt',
    is_direct: true,
    hotels: 37,
    nights: 4047,
    compared: 3997,
    cheapest: 1429,
    median_gap_pct: 7,
  },
];

const FACTS: ProviderFacts = {
  day: '2026-11-02',
  hotels: 83,
  cities: 27,
  nights: 9247,
  providers: PROVIDERS,
  accuracy: {
    days: 19,
    since: '2026-10-14',
    pairs: 15_200,
    within_3: 10_300,
    stays: 4_712,
    stays_within_3: 3_181,
    median_gap_pct: 0.8,
  },
  tests: { n: 16, providers: 3, last: '2026-11-02' },
};

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ p?: string }>;
};

/** `/dev/provider?p=<slug>` shows one provider page; `?p=method` the /methodik live block. */
export default async function DevProviderPage({ params, searchParams }: Props) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const { p = 'booking-com' } = await searchParams;
  if (p === 'method' || p === 'method-empty') {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7">
        <MethodLive
          load={p === 'method' ? { kind: 'ok', facts: FACTS } : { kind: 'unavailable' }}
        />
      </div>
    );
  }
  const provider = PROVIDERS.find((x) => x.slug === p);
  if (!provider) notFound();
  return <ProviderView provider={provider} facts={FACTS} />;
}
