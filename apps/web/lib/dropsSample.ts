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
  nights = 5,
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

/**
 * Sample drops (C-080a, C-125): five hotels with 5- and 7-night trips, one with several trips over
 * two months, one a first-ever low. Prices are totals for the trip.
 */
export function sampleRows(): PriceDropRow[] {
  return [
    row(FAIRMONT, 9, 490_000, 620_000, BOOKING, 6, 7),
    row(BAUR, 12, 342_000, 494_500, BOOKING),
    row(BAUR, 13, 498_400, 672_000, BOOKING, 9, 7),
    row(BAUR, 19, 374_000, 461_500, EXPEDIA),
    row(BAUR, 26, 385_000, 467_500, BOOKING),
    row(BAUR, 33, 399_500, 475_500, BOOKING),
    row(ADLON, 3, 194_500, 263_000, ['adlon', 'Hotelseite', true]),
    row(CLARIDGES, 41, 784_000, 966_000, EXPEDIA, 1, 7),
    row(ARTS, 6, 157_500, 190_500, BOOKING),
  ];
}

export function sampleDrops(): HotelDropsWithPhoto[] {
  return groupDrops(sampleRows()).map((g) => ({
    ...g,
    image: hotelImage(g.hotel.slug, g.city.slug, 960),
  }));
}

/**
 * Sample "Aus unseren Videos" (C-080j): the Fairmont trip (still on the radar), Baur au Lac
 * (still on, a bit cheaper than in the video) and a Claridge's trip that is over.
 */
export function samplePosted(): PostedDrop[] {
  const today = berlinToday();
  const [fairmont, baur] = sampleRows();
  const claridges = row(CLARIDGES, 20, 728_000, 917_000, EXPEDIA, 5, 7);
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
      posted(baur && { ...baur, now_cents: 351_000, drop_pct: 1 - 351_000 / baur.prev_cents }, 2, [
        'tiktok',
      ]),
      posted(claridges, 3, ['tiktok']),
    ].filter((r) => r !== undefined),
  );
}
