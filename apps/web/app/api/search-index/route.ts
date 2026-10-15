import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@tidaq/core';
import { getCatalog } from '@/lib/data/catalog';
import { getDrops } from '@/lib/data/drops';
import { sampleDrops } from '@/lib/dropsSample';
import { searchIndex } from '@/lib/searchIndex';
import { SEARCH_SAMPLE } from '@/lib/searchSample';
import { berlinToday } from '@/lib/today';

export const dynamic = 'force-dynamic';

/**
 * The search index for the navbar search (C-107b): fetched when someone opens the search on a
 * page without the hero bar, so pages don't carry ~10 kB of hotels in their HTML. Public data
 * only; cached briefly at the edge (drops change once a morning).
 */
export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('locale') ?? 'de';
  const locale = isLocale(param) ? param : 'de';
  const today = berlinToday();
  const [catalog, drops] = await Promise.all([getCatalog(), getDrops(today)]);
  // Without a database (local, CI) outside production: the /dev/search sample, so the navbar
  // search can be tried and tested. Production without data stays empty.
  const sample = !catalog && process.env.APP_ENV !== 'production';
  const index = sample
    ? searchIndex(SEARCH_SAMPLE, sampleDrops(), locale)
    : searchIndex(catalog?.hotels ?? [], drops.kind === 'ok' ? drops.drops : [], locale);
  return NextResponse.json(index, {
    headers: {
      'cache-control': catalog
        ? 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600'
        : 'no-store',
    },
  });
}
