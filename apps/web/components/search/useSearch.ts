'use client';

import { useEffect, useState } from 'react';
import { cityStayPath, hotelPath, localizedPath, stayPath, type Locale } from '@tidaq/core';
import type { Destination, HotelNights, SearchIndex } from './types';

export type SearchErrors = {
  missing: string;
  datesMissing: string;
  order: string;
  tooLong: string;
  past: string;
};

export type SearchProblem = { field: 'where' | 'dates'; text: string };

const MAX_NIGHTS = 30;
const DAY_MS = 86_400_000;

export function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** "12. Dez. – 14. Dez." / "12 Dec – 14 Dec". */
export function dateRange(from: string, to: string, locale: Locale): string {
  const f = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return `${f.format(new Date(`${from}T00:00:00Z`))} – ${f.format(new Date(`${to}T00:00:00Z`))}`;
}

/** Nights per hotel, fetched once per page view. */
const nightsCache = new Map<string, Promise<HotelNights>>();
const NO_NIGHTS: HotelNights = { nights: [], weekends: [] };

function loadNights(slug: string): Promise<HotelNights> {
  let request = nightsCache.get(slug);
  if (!request) {
    request = fetch(`/api/hotel-nights?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<HotelNights>) : NO_NIGHTS))
      .catch(() => {
        nightsCache.delete(slug);
        return NO_NIGHTS;
      });
    nightsCache.set(slug, request);
  }
  return request;
}

/**
 * The search's state and its submit rules (PREMIUM.md §9.3), shared by the desktop bar and the
 * phone flow: destination, dates, adults, the picked hotel's nightly prices, validation and
 * where "Preis prüfen" goes (stay page, hotel page, or the city page, with dates sorted by them).
 */
export function useSearch({
  index,
  today,
  locale,
  errors,
}: {
  index: SearchIndex;
  today: string;
  locale: Locale;
  errors: SearchErrors;
}) {
  const [dest, setDest] = useState<Destination>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [going, setGoing] = useState(false);
  const [loaded, setLoaded] = useState<{ slug: string; data: HotelNights } | null>(null);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;
  const hotelSlug = dest?.kind === 'hotel' ? dest.slug : null;

  // A picked hotel's nightly prices tint the calendar.
  useEffect(() => {
    if (!hotelSlug) return;
    let live = true;
    void loadNights(hotelSlug).then((data) => live && setLoaded({ slug: hotelSlug, data }));
    return () => {
      live = false;
    };
  }, [hotelSlug]);

  const problem = (): SearchProblem | null => {
    if (!dest) return { field: 'where', text: errors.missing };
    if (!checkIn && !checkOut) return null;
    if (!checkIn || !checkOut) return { field: 'dates', text: errors.datesMissing };
    if (checkIn < today) return { field: 'dates', text: errors.past };
    if (checkOut <= checkIn) return { field: 'dates', text: errors.order };
    if ((nights ?? 0) > MAX_NIGHTS) return { field: 'dates', text: errors.tooLong };
    return null;
  };

  /** Validates and navigates. Returns the problem to show, or null when it's on its way. */
  const submit = (): SearchProblem | null => {
    setSubmitted(true);
    const p = problem();
    if (p || !dest) return p;
    if (dest.kind === 'city') {
      const city = index.cities.find((c) => c.slug === dest.slug);
      if (!city) return null;
      setGoing(true);
      // With dates the city page sorts its hotels by the total for them (C-110).
      window.location.assign(
        checkIn && checkOut
          ? localizedPath(cityStayPath(city.slug, checkIn, checkOut, adults), locale)
          : city.href,
      );
      return null;
    }
    setGoing(true);
    const path =
      checkIn && checkOut ? stayPath(dest.slug, checkIn, checkOut, adults) : hotelPath(dest.slug);
    window.location.assign(localizedPath(path, locale));
    return null;
  };

  const setDates = (nextIn: string, nextOut: string) => {
    setCheckIn(nextIn);
    setCheckOut(nextOut);
  };

  const reset = () => {
    setDest(null);
    setDates('', '');
    setAdults(2);
    setSubmitted(false);
  };

  return {
    dest,
    setDest,
    checkIn,
    checkOut,
    setDates,
    adults,
    setAdults,
    nights,
    hotel: hotelSlug && loaded?.slug === hotelSlug ? loaded.data : null,
    error: submitted ? problem() : null,
    submit,
    going,
    reset,
  };
}
