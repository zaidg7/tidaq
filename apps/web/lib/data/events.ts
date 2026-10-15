import 'server-only';
import { z } from '@tidaq/core';
import { isBot } from './requestStay';
import { hasSupabase, rpc } from './supabase';
import { reportError } from '@/lib/errors';

export type ViewEvent =
  | {
      name: 'stay_view';
      props: { hotel: string; nights: number; adults: number; daysAhead: number };
    }
  | { name: 'hotel_view'; props: { hotel: string } }
  | { name: 'city_view'; props: { city: string } }
  /** The Preissturz-Radar; `ref` = the social bio link it came through, or `none` (C-080d). */
  | { name: 'drops_view'; props: { ref: string } };

/**
 * Counts a page view (C-029): what was viewed, never who (no IP, no user agent, no id). Call it
 * in `after()`, so it never slows the page; bots and missing Supabase are skipped, errors only
 * logged. SQL `log_event` accepts known names only and caps the day.
 */
export async function logView(event: ViewEvent, userAgent: string | null): Promise<void> {
  if (!hasSupabase() || isBot(userAgent)) return;
  try {
    await rpc('log_event', { p_name: event.name, p_props: event.props }, z.unknown(), 2000);
  } catch (error) {
    reportError('log event failed', error, { name: event.name });
  }
}
