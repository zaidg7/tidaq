import { cityPhoto } from './cityPhotos';
import { hotelPhoto, type PhotoSize } from './hotelPhotos';

/** A photo size plus whether it is the city's photo standing in for the hotel's own (C-105). */
export type ImageRef = PhotoSize & { city?: true };

/**
 * The hotel's own photo, else its city's photo marked `city: true` (shown with a "Stadtbild" tag,
 * PREMIUM.md §7.1), else null. `width` 160 is for thumbnails, 960 for cards and pages.
 */
export function hotelImage(
  hotelSlug: string,
  citySlug: string | null | undefined,
  width: 160 | 960,
): ImageRef | null {
  const own = hotelPhoto(hotelSlug)?.[width];
  if (own) return own;
  const city = citySlug ? cityPhoto(citySlug) : null;
  if (!city) return null;
  return { ...(width === 160 ? city[480] : city[960]), city: true };
}

/** The city's 960 px photo as a stand-in (`city: true`), or null. */
export function cityImage(citySlug: string | null | undefined): ImageRef | null {
  const city = citySlug ? cityPhoto(citySlug) : null;
  return city ? { ...city[960], city: true } : null;
}
