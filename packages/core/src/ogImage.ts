import { dropKey } from './drops';
import type { Locale } from './format';

/** Size of the link-preview images (Open Graph, X large card). */
export const OG_IMAGE = { width: 1200, height: 630 } as const;

/**
 * The link-preview image of a drop page (C-028c): drawn by the Supabase Edge Function `og-drop`
 * from today's radar, with the hotel photo, "−31 %", both prices and the dates. Null without a
 * Supabase URL (local, CI): pages then keep the hotel photo.
 */
export function dropOgImageUrl(
  supabaseUrl: string | undefined,
  slug: string,
  stay: { night: string; checkOut: string },
  locale: Locale,
): string | null {
  if (!supabaseUrl) return null;
  const q = new URLSearchParams({ hotel: slug, stay: dropKey(stay), l: locale });
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/og-drop?${q}`;
}
