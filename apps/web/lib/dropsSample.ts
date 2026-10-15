import { addDays, groupDrops, postedDrops, type PriceDropRow, type PostedDrop } from '@tidaq/core';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { hotelImage } from '@/lib/photos';
import { berlinToday } from '@/lib/today';

/** Sample price drops for `/dev/drops` and `/dev/admin/drops` (C-080), relative to today. */
type Hotel = [id: number, slug: string, name: string, city: string, de: string, en: string];
export const ADLON: Hotel = [
  1,
  'hotel-adlon-kempinski-berlin',
  'Hotel Adlon Kempinski',
  'berlin',
  'Berlin',
  'Berlin',
];
const BAUR: Hotel = [2, 'baur-au-lac-zuerich', 'Baur au Lac', 'zuerich', 'Zürich', 'Zurich'];
const CLARIDGES: Hotel = [3, 'claridges-london', "Claridge's", 'london', 'London', 'London'];
const FAIRMONT: Hotel = [
  5,
  'fairmont-hotel-vier-jahreszeiten-hamburg',
  'Fairmont Hotel Vier Jahreszeiten',
  'hamburg',
  'Hamburg',
  'Hamburg',
];
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
  nights = 1,
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
    ...(nights > 1 && { check_out: addDays(today, inDays + nights) }),
    seen_day: today,
    seen_at: `${today}T06:12:00Z`,
    now_cents: now,
    prev_cents: prev,
    drop_pct: 1 - now / prev,
    prior_low_cents: prev,
    prior_days: priorDays,
    prior_avg_cents: Math.round(prev * 1.04),
    provider_slug: provider[0],
    provider_name: provider[1],
    provider_direct: provider[2] ?? false,
    offers: 4,
    confirmed: true,
  };
}

const BOOKING: [string, string] = ['booking-com', 'Booking.com'];
const EXPEDIA: [string, string] = ['expedia', 'Expedia'];

/** Days from today to the second Friday ahead (a weekend at least a week out). */
function nextFriday(): number {
  const dow = new Date(`${berlinToday()}T00:00:00Z`).getUTCDay();
  return ((5 - dow + 7) % 7) + 7;
}

/**
 * Sample drops (C-080a/f): five hotels, one with several nights, one a first-ever low, one a
 * Friday-to-Sunday weekend.
 */
export function sampleRows(): PriceDropRow[] {
  return [
    row(FAIRMONT, nextFriday(), 98_000, 124_000, BOOKING, 6, 2),
    row(BAUR, 12, 68_400, 98_900, BOOKING),
    row(BAUR, 13, 71_200, 96_000, BOOKING),
    row(BAUR, 19, 74_800, 92_300, EXPEDIA),
    row(BAUR, 26, 77_000, 93_500, BOOKING),
    row(BAUR, 33, 79_900, 95_100, BOOKING),
    row(ADLON, 3, 38_900, 52_600, ['adlon', 'Hotelseite', true]),
    row(CLARIDGES, 41, 112_000, 138_000, EXPEDIA, 1),
    row(ARTS, 6, 31_500, 38_100, BOOKING),
  ];
}

export function sampleDrops(): HotelDropsWithPhoto[] {
  return groupDrops(sampleRows()).map((g) => ({
    ...g,
    image: hotelImage(g.hotel.slug, g.city.slug, 960),
  }));
}

/**
 * Sample "Aus unseren Videos" (C-080j): the Fairmont weekend (still on the radar), Baur au Lac
 * (still on, a bit cheaper than in the video) and a Claridge's night that is over.
 */
export function samplePosted(): PostedDrop[] {
  const today = berlinToday();
  const [fairmont, baur] = sampleRows();
  const claridges = row(CLARIDGES, 20, 104_000, 131_000, EXPEDIA, 5);
  const posted = (
    r: PriceDropRow | undefined,
    daysAgo: number,
    platforms: ('tiktok' | 'instagram')[],
  ) =>
    r && {
      ...r,
      check_out: r.check_out ?? addDays(r.night, 1),
      seen_day: addDays(today, -daysAgo),
      posted_on: addDays(today, -daysAgo),
      platforms,
    };
  return postedDrops(
    [
      posted(fairmont, 1, ['instagram', 'tiktok']),
      posted(baur && { ...baur, now_cents: 70_200, drop_pct: 1 - 70_200 / baur.prev_cents }, 2, [
        'tiktok',
      ]),
      posted(claridges, 3, ['tiktok']),
    ].filter((r) => r !== undefined),
  );
}
