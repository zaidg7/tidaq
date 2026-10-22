import 'server-only';
import { z } from '@tidaq/core';
import { reportError } from '@/lib/errors';
import { rest } from './supabase';

/**
 * The sites where we know this hotel's own page (C-133, `hotel_provider_pages`), as provider ids.
 * Trip.com and Agoda are only linked with one (C-177, core `canLinkOut`). A failed read means no
 * such links: better no button than one to an empty search.
 */
export async function hotelPageProviders(hotelId: number): Promise<Set<number>> {
  try {
    const rows = await rest(
      `hotel_provider_pages?select=provider_id&hotel_id=eq.${hotelId}`,
      z.object({ provider_id: z.number() }),
    );
    return new Set(rows.map((r) => r.provider_id));
  } catch (error) {
    reportError('hotel pages unavailable', error, { hotelId });
    return new Set();
  }
}
