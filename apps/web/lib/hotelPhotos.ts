import { HOTEL_PHOTOS } from './hotelPhotos.generated';

/** One size of a self-hosted hotel photo (C-011c). */
export type PhotoSize = { src: string; width: number; height: number };
export type HotelPhoto = Record<160 | 960, PhotoSize>;

/**
 * The hotel's photo, served from our own domain (`/hotels/<slug>-<w>.webp`), or null. Pages never
 * load the Wikimedia original: no third-party cookies, no visitor IPs to anyone else (D-15).
 * Credit and source link still come from the database (`image_credit`, `image_source_url`).
 */
export function hotelPhoto(slug: string): HotelPhoto | null {
  return HOTEL_PHOTOS[slug] ?? null;
}
