import { addDays, groupDrops, type PriceDropRow } from '@tidaq/core';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { hotelPhoto } from '@/lib/hotelPhotos';
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
export function sampleDrops(): HotelDropsWithPhoto[] {
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
