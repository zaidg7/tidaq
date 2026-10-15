import { CITY_PHOTOS } from './cityPhotos.generated';
import type { HotelPhoto, PhotoSize } from './hotelPhotos';

/**
 * A self-hosted city photo (C-105, Unsplash License): 480, 960 and 1600 px, a blur placeholder,
 * the German alt text and the Unsplash page it came from.
 */
export type CityPhoto = {
  480: PhotoSize;
  960: PhotoSize;
  1600: PhotoSize;
  lqip: string;
  focus?: string;
  alt: string;
  source: string;
};

export function cityPhoto(slug: string): CityPhoto | null {
  return CITY_PHOTOS[slug] ?? null;
}

/** A city photo in the shape `Photo` takes (the 160 slot gets the 480 file). */
export function cityPhotoAsHotelPhoto(p: CityPhoto): HotelPhoto {
  return { 160: p[480], 480: p[480], 960: p[960], 1600: p[1600], lqip: p.lqip, focus: p.focus };
}
