import 'server-only';
import { z, type StayParams } from '@tidaq/core';
import { hasSupabase, rpc } from './supabase';

/** Crawlers, link previews and audits: they must not use up the day's stay requests. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|curl|wget/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

/**
 * C-070b: a visitor opened dates we don't check as a real stay yet. Ask `request_stay` (C-022c1)
 * to track them: inside the 120-day night grid the page already has a history from the nights,
 * and the real check adds today's exact total; further out it is the only way to get prices.
 * The function caps requests per day and refuses when the collector is full. Best effort: runs
 * after the response, never throws, ignores bots.
 */
export async function requestStayOnView(
  slug: string,
  p: StayParams,
  userAgent: string | null,
): Promise<string | null> {
  if (!hasSupabase() || isBot(userAgent)) return null;
  try {
    return await rpc(
      'request_stay',
      { p_hotel_slug: slug, p_check_in: p.checkIn, p_check_out: p.checkOut, p_adults: p.adults },
      z.enum(['tracked', 'created', 'full', 'invalid']),
      2500,
    );
  } catch (error) {
    console.error(JSON.stringify({ msg: 'request_stay failed', slug, error: String(error) }));
    return null;
  }
}
