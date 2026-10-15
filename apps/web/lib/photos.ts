import { cityPhoto, cityPhotoAsHotelPhoto } from './cityPhotos';
import { hotelPhoto, type HotelPhoto, type PhotoSize } from './hotelPhotos';

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

/**
 * The full photo (every size, blur placeholder, focal point) for a card: the hotel's own, else
 * its city's with `city: true` (shown with the "Stadtbild" tag), else null.
 */
export function cardPhoto(
  hotelSlug: string,
  citySlug: string | null | undefined,
): { photo: HotelPhoto; city: boolean } | null {
  const own = hotelPhoto(hotelSlug);
  if (own) return { photo: own, city: false };
  const city = citySlug ? cityPhoto(citySlug) : null;
  if (!city) return null;
  return { photo: { ...cityPhotoAsHotelPhoto(city), focus: standInFocus(hotelSlug) }, city: true };
}

/** Crops of a landscape city photo for a portrait card: far left, far right, centre, left-centre. */
const STAND_IN_FOCUS = ['12% 50%', '88% 50%', '50% 50%', '32% 50%'] as const;

/**
 * Hotels without their own photo yet (C-104), numbered within their city: the first gets the
 * first crop, and so on, so hotels of one city never share a crop. Hotels added later fall back
 * to a hash of the slug.
 */
const STAND_IN_SLOT: Record<string, number> = {
  'four-seasons-hotel-abu-dhabi-at-al-maryah-island': 0,
  'rosewood-abu-dhabi': 1,
  'the-abu-dhabi-edition': 2,
  'the-st-regis-saadiyat-island-resort-abu-dhabi': 3,
  'capella-bangkok': 0,
  'the-siam-bangkok': 1,
  'bvlgari-resort-dubai': 0,
  'four-seasons-resort-dubai-at-jumeirah-beach': 1,
  'mandarin-oriental-jumeira-dubai': 2,
  'sofitel-frankfurt-opera': 0,
  'the-florentin-frankfurt': 1,
  'bulgari-hotel-milano': 0,
  'mandarin-oriental-milan': 1,
  'park-hyatt-milano': 2,
  'cheval-blanc-randheli-malediven': 0,
  'the-ritz-carlton-maldives-fari-islands': 1,
  'waldorf-astoria-maldives-ithaafushi': 2,
  'bvlgari-hotel-shanghai': 0,
  'the-shanghai-edition': 1,
  'aman-tokyo': 0,
  'four-seasons-hotel-tokyo-at-otemachi': 1,
};

/**
 * The same city photo stands in for up to four hotels of a city, often side by side in one row.
 * Each hotel gets its own crop of it, so the tiles don't look copied.
 */
export function standInFocus(hotelSlug: string): string {
  let slot = STAND_IN_SLOT[hotelSlug];
  if (slot === undefined) {
    let h = 0;
    for (const ch of hotelSlug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    slot = h;
  }
  return STAND_IN_FOCUS[slot % STAND_IN_FOCUS.length] ?? '50% 50%';
}
