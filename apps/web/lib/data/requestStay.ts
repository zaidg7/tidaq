import 'server-only';
import { z, type StayParams } from '@tidaq/core';
import { hasSupabase, rpc } from './supabase';
import { reportError } from '@/lib/errors';

/** Crawlers, link previews and audits: they must not use up the day's stay requests. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|curl|wget/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

/**
 * C-070b: a visitor opened dates we don't check as a real stay yet. Ask `request_stay` (C-022c1)
 * to track them: inside the 270-day night grid the page already has a history from the nights,
 * and the real check adds today's exact total; further out it is the only way to get prices.
 * The function caps new requests per day ('full'); the collector keeps room in its daily cap for
 * them (C-132a). Best effort: never throws, ignores bots.
 */
export async function requestStayOnView(
  slug: string,
  p: StayParams,
  userAgent: string | null,
): Promise<'tracked' | 'created' | 'full' | 'invalid' | null> {
  if (!hasSupabase() || isBot(userAgent)) return null;
  try {
    return await rpc(
      'request_stay',
      { p_hotel_slug: slug, p_check_in: p.checkIn, p_check_out: p.checkOut, p_adults: p.adults },
      z.enum(['tracked', 'created', 'full', 'invalid']),
      2500,
    );
  } catch (error) {
    reportError('request_stay failed', error, { slug });
    return null;
  }
}
