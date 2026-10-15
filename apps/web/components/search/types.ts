import type { PhotoSize } from '@/lib/hotelPhotos';

/** A city in the search (C-107): name in the page language, its page and a 160 px thumbnail. */
export type SearchCity = {
  slug: string;
  name: string;
  href: string;
  thumb: PhotoSize | null;
  hotels: number;
};

/**
 * A hotel in the search. `thumb` is the hotel's own photo only: a city photo at 48 px can't
 * carry its "Stadtbild" tag, so those rows show a neutral tile. `drop` is today's biggest drop
 * (0.31 = 31 %), when there is one.
 */
export type SearchDestHotel = {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  thumb: PhotoSize | null;
  drop?: number;
};

export type SearchIndex = {
  cities: SearchCity[];
  hotels: SearchDestHotel[];
  /** "Beliebte Städte": up to 8 city slugs, most hotels first. */
  popular: string[];
  /** "Gerade günstig": up to 3 hotel slugs with today's biggest drops. */
  cheap: string[];
};

export type Destination = { kind: 'hotel' | 'city'; slug: string } | null;

/** `/api/hotel-nights`: today's price of every night at one hotel, level 0 (cheap) … 4 (dear). */
export type HotelNights = {
  nights: { night: string; cents: number | null; level: number | null }[];
};
