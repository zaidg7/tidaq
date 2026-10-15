import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { addDays, groupDrops, type DailyPrice, type Locale, type PriceDropRow } from '@tidaq/core';
import { DropOver, DropPage } from '@/components/drops/DropPage';
import { DropsTeaser, dropsHref } from '@/components/drops/DropsTeaser';
import { applyDropFilters, DropsView } from '@/components/drops/DropsView';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { berlinToday } from '@/lib/today';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Hotel = [id: number, slug: string, name: string, city: string, de: string, en: string];
const ADLON: Hotel = [
  1,
  'hotel-adlon-kempinski-berlin',
  'Hotel Adlon Kempinski',
  'berlin',
  'Berlin',
  'Berlin',
];
const BAUR: Hotel = [2, 'baur-au-lac-zuerich', 'Baur au Lac', 'zuerich', 'Zürich', 'Zurich'];
const CLARIDGES: Hotel = [3, 'claridges-london', "Claridge's", 'london', 'London', 'London'];
const ARTS: Hotel = [
  4,
  'hotel-arts-barcelona',
  'Hotel Arts Barcelona',
  'barcelona',
  'Barcelona',
  'Barcelona',
];

/** One sample row: `inDays` from today, today's price against the day before's. */
function row(
  h: Hotel,
  inDays: number,
  now: number,
  prev: number,
  provider: [slug: string, name: string, direct?: boolean],
  priorDays = 9,
): PriceDropRow {
  const today = berlinToday();
  return {
    hotel_id: h[0],
    hotel_slug: h[1],
    hotel_name: h[2],
    city_slug: h[3],
    city_name_de: h[4],
    city_name_en: h[5],
    night: addDays(today, inDays),
    seen_day: today,
    seen_at: `${today}T06:12:00Z`,
    now_cents: now,
    prev_cents: prev,
    drop_pct: 1 - now / prev,
    prior_low_cents: prev,
    prior_days: priorDays,
    provider_slug: provider[0],
    provider_name: provider[1],
    provider_direct: provider[2] ?? false,
    offers: 4,
    confirmed: true,
  };
}

const BOOKING: [string, string] = ['booking-com', 'Booking.com'];
const EXPEDIA: [string, string] = ['expedia', 'Expedia'];

/** Sample drops (C-080a): four hotels, one with several nights, one a first-ever low. */
function sample(): HotelDropsWithPhoto[] {
  return groupDrops([
    row(BAUR, 12, 68_400, 98_900, BOOKING),
    row(BAUR, 13, 71_200, 96_000, BOOKING),
    row(BAUR, 19, 74_800, 92_300, EXPEDIA),
    row(BAUR, 26, 77_000, 93_500, BOOKING),
    row(BAUR, 33, 79_900, 95_100, BOOKING),
    row(ADLON, 3, 38_900, 52_600, ['adlon', 'Hotelseite', true]),
    row(CLARIDGES, 41, 112_000, 138_000, EXPEDIA, 1),
    row(ARTS, 6, 31_500, 38_100, BOOKING),
  ]).map((g) => ({ ...g, image: hotelPhoto(g.hotel.slug)?.[960] ?? null }));
}

/** 30 days of a night's price, wobbling around the day before's price, then the drop today. */
function history(prevCents: number, nowCents: number, today: string): DailyPrice[] {
  const wobble = [
    3, -2, 4, 1, -3, 2, 5, 0, -1, 3, 2, -2, 4, 6, 1, -1, 2, 3, 0, 4, 2, -2, 1, 3, 5, 2, 0, 1,
  ];
  return [
    ...wobble.map((w, i) => ({
      day: addDays(today, i - 29),
      bestCents: Math.round((prevCents * (1 + w / 100)) / 100) * 100,
    })),
    { day: addDays(today, -1), bestCents: prevCents },
    { day: today, bestCents: nowCents },
  ];
}

/**
 * `/dev/drops`: the radar with sample data. `?empty`: empty state; `?teaser`: the section;
 * `?share` or `?share=<slug>`: a drop page (C-080b); `?over`: a drop that's gone.
 */
export default async function DevDropsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    empty?: string;
    teaser?: string;
    share?: string;
    over?: string;
    stadt?: string;
    wann?: string;
    sort?: string;
  }>;
}) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const all = q.empty !== undefined ? [] : sample();
  const today = berlinToday();
  if (q.over !== undefined) {
    return (
      <DropOver
        hotel={{ slug: ADLON[1], name: ADLON[2] }}
        night={addDays(today, 3)}
        locale={locale}
        today={today}
      />
    );
  }
  if (q.share !== undefined) {
    const group = all.find((g) => g.hotel.slug === q.share) ?? all[0];
    if (!group) notFound();
    return (
      <DropPage
        group={group}
        drop={group.top}
        series={history(group.top.prevCents, group.top.nowCents, today)}
        others={all.filter((g) => g !== group)}
        locale={locale}
        today={today}
        now={new Date()}
      />
    );
  }
  if (q.teaser !== undefined) {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-5 py-14 md:px-7">
        <DropsTeaser
          drops={all}
          locale={locale}
          title={(await getTranslations({ locale, namespace: 'drops' }))('homeTitle')}
          href={dropsHref(locale)}
          id="drops-title"
        />
      </div>
    );
  }
  const { filters, shown } = applyDropFilters(all, q, today);
  return (
    <DropsView
      all={all}
      shown={shown}
      filters={filters}
      seenAt={all[0]?.top.seenAt ?? null}
      now={new Date()}
    />
  );
}
