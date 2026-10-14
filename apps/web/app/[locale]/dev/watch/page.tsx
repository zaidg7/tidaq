import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { ManageView } from '@/components/watch/ManageView';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Sample manage page (C-030): one alert with a target, one without, unconfirmed with `?neu`. */
export default async function DevWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ neu?: string }>;
}) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const { neu } = await searchParams;
  return (
    <ManageView
      token="00000000-0000-4000-8000-000000000000"
      notice={neu === undefined ? 'Danke, dein Preisalarm ist bestätigt.' : null}
      data={{
        email: 'gast@example.com',
        locale,
        confirmed: neu === undefined,
        watches: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            hotel_slug: 'hotel-adlon-kempinski-berlin',
            hotel_name: 'Hotel Adlon Kempinski',
            check_in: '2026-12-04',
            check_out: '2026-12-06',
            adults: 2,
            target_cents: 100_000,
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            hotel_slug: 'baur-au-lac-zuerich',
            hotel_name: 'Baur au Lac',
            check_in: '2027-01-15',
            check_out: '2027-01-18',
            adults: 1,
            target_cents: null,
          },
        ],
      }}
    />
  );
}
