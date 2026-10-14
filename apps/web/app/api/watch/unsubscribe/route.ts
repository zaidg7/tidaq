import { NextResponse, type NextRequest } from 'next/server';
import { localizedPath } from '@tidaq/core';
import { isUuid, unsubscribe, WATCH_PATHS } from '@/lib/watch/watch';

export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe (RFC 8058, `List-Unsubscribe-Post`): mail programs POST here and the
 * address with all its alerts is deleted. A GET (someone opening the link) goes to the manage
 * page, where the visitor decides.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!isUuid(token)) return new NextResponse(null, { status: 400 });
  const ok = await unsubscribe(token).catch(() => false);
  return new NextResponse(null, {
    status: ok ? 200 : 404,
    headers: { 'cache-control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const target = isUuid(token) ? localizedPath(WATCH_PATHS.manage(token), 'de') : '/';
  return NextResponse.redirect(new URL(target, request.nextUrl.origin), 303);
}
