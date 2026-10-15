import { HOTEL_PHOTOS } from './hotelPhotos.generated';

/** One size of a self-hosted photo. */
export type PhotoSize = { src: string; width: number; height: number };

/**
 * A self-hosted hotel photo (C-011c, C-104): each size fitted inside a square of that width.
 * 480 and 1600 exist for photos picked in C-104; older photos only have 160 and 960.
 */
export type HotelPhoto = {
  160: PhotoSize;
  960: PhotoSize;
  480?: PhotoSize;
  1600?: PhotoSize;
  /** 24 px blurred preview as a data URI, shown while the real image loads. */
  lqip?: string;
  /** Focal point as CSS object-position, e.g. "50% 40%". */
  focus?: string;
};

/**
 * The hotel's photo, served from our own domain (`/hotels/<slug>-<w>.webp`), or null. Pages never
 * load the Wikimedia original: no third-party cookies, no visitor IPs to anyone else (D-15).
 * Credit and source link come from the database (`image_credit`, `image_source_url`).
 */
export function hotelPhoto(slug: string): HotelPhoto | null {
  return HOTEL_PHOTOS[slug] ?? null;
}

/** `srcset` from every size the photo has, smallest first. */
export function photoSrcSet(photo: HotelPhoto): string {
  return ([160, 480, 960, 1600] as const)
    .map((w) => photo[w])
    .filter((s): s is PhotoSize => Boolean(s))
    .map((s) => `${s.src} ${s.width}w`)
    .join(', ');
}
