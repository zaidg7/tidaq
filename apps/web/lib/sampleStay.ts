import { addDays, computeStayStats, type DailyPrice } from '@tidaq/core';
import type { FeaturedStay } from './data/featured';

/**
 * A believable 60-day series (weekly rhythm, slow fall, two missing days, a dip around day 41).
 * Used by /dev/ui and as the clearly labelled "Beispieldaten" fallback on the homepage.
 */
export function sampleSeries(to: string): DailyPrice[] {
  return Array.from({ length: 60 }, (_, i) => {
    const wave = Math.sin((i / 7) * Math.PI * 2) * 2_400;
    const drift = (30 - i) * 180;
    const dip = i >= 40 && i <= 43 ? -6_500 : 0;
    return { day: addDays(to, i - 59), bestCents: Math.round(118_000 + wave + drift + dip) };
  }).filter((_, i) => i !== 22 && i !== 23);
}

/** The homepage example when no live stay is available. Names are generic on purpose. */
export function sampleFeaturedStay(today: string): FeaturedStay {
  const series = sampleSeries(today);
  const checkIn = addDays(today, 49);
  const now = series.at(-1)?.bestCents ?? 118_000;
  return {
    stayId: 0,
    hotel: {
      slug: 'beispiel',
      name: 'Grandhotel am See',
      citySlug: 'beispiel',
      cityName: { de: 'Beispielstadt', en: 'Example city' },
      image: null,
    },
    checkIn,
    checkOut: addDays(checkIn, 2),
    nights: 2,
    adults: 2,
    series,
    stats: computeStayStats(series, today, checkIn),
    offers: [
      {
        providerSlug: 'direct',
        providerName: 'Hotel direkt',
        isDirect: true,
        totalCents: now + 4_000,
      },
      { providerSlug: 'booking', providerName: 'Booking.com', isDirect: false, totalCents: now },
      {
        providerSlug: 'expedia',
        providerName: 'Expedia',
        isDirect: false,
        totalCents: now + 2_100,
      },
    ],
    updatedAt: null,
  };
}
