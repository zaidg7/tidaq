import type { Metadata } from 'next';
import type { Locale } from '@tidaq/core';
import type { PhotoSize } from './hotelPhotos';

/** Default share image (C-028b), rendered by `scripts/og/render.mjs`. */
export const DEFAULT_OG = { url: '/og/default.png', width: 1200, height: 630 };

/**
 * Open Graph for a page (C-028b). Next replaces `openGraph` per page instead of merging it with
 * the layout's, so every page passes through here: site name, language, and the hotel's
 * licensed photo when there is one, else the default image. URLs are made absolute by
 * `metadataBase` (layout).
 */
export function openGraphFor(
  locale: Locale,
  opts: {
    title?: string;
    description?: string;
    photo?: PhotoSize | null;
    alt?: string;
    /** A ready preview image (C-028c: the drop card), ahead of the photo. */
    image?: { url: string; width: number; height: number } | null;
  } = {},
): NonNullable<Metadata['openGraph']> {
  const image = opts.image
    ? { ...opts.image, alt: opts.alt }
    : opts.photo
      ? { url: opts.photo.src, width: opts.photo.width, height: opts.photo.height, alt: opts.alt }
      : { ...DEFAULT_OG, alt: 'Tidaq' };
  return {
    type: 'website',
    siteName: 'Tidaq',
    locale: locale === 'de' ? 'de_DE' : 'en_GB',
    ...(opts.title && { title: opts.title }),
    ...(opts.description && { description: opts.description }),
    images: [image],
  };
}
