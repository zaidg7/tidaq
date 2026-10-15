import { NextResponse, type NextRequest } from 'next/server';
import { priceLevels } from '@tidaq/core';
import { getHotelPage } from '@/lib/data/hotel';
import { hasSupabase } from '@/lib/data/supabase';
import { SEARCH_SAMPLE, sampleNights } from '@/lib/searchSample';
import { berlinToday } from '@/lib/today';
import type { HotelNights } from '@/components/search/types';

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,120}$/;

/**
 * Today's price of every night at one hotel, with its level (C-108): the search calendar tints
 * the nights once a hotel is picked. Public data (the hotel page shows the same), cached at the
 * edge for 30 minutes. Without a database outside production: sample nights for sample hotels.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  if (!SLUG.test(slug)) return NextResponse.json({ nights: [] }, { status: 400 });
  const today = berlinToday();

  let rows: { night: string; cents: number | null }[] = [];
  let cache = 'no-store';
  if (!hasSupabase() && process.env.APP_ENV !== 'production') {
    rows = SEARCH_SAMPLE.some((h) => h.slug === slug) ? sampleNights(slug, today) : [];
  } else {
    const load = await getHotelPage(slug, today);
    if (load.kind === 'missing') return NextResponse.json({ nights: [] }, { status: 404 });
    if (load.kind === 'ok') {
      rows = load.data.nights.map((n) => ({ night: n.night, cents: n.bestCents }));
      cache = 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600';
    }
  }
  const levels = priceLevels(rows.map((r) => r.cents));
  const body: HotelNights = { nights: rows.map((r, i) => ({ ...r, level: levels[i] ?? null })) };
  return NextResponse.json(body, { headers: { 'cache-control': cache } });
}
