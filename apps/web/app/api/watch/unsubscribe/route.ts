import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, createRateLimiter, localizedPath } from '@tidaq/core';
import { isUuid, unsubscribe, WATCH_PATHS } from '@/lib/watch/watch';

export const dynamic = 'force-dynamic';

/** 10 unsubscribes a minute per IP and Worker isolate (C-041b): tokens can't be guessed anyway. */
const limiter = createRateLimiter({ max: 10, windowMs: 60_000 });

/**
 * One-click unsubscribe (RFC 8058, `List-Unsubscribe-Post`): mail programs POST here and the
 * address with all its alerts is deleted. A GET (someone opening the link) goes to the manage
 * page, where the visitor decides.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  if (ip && limiter.limited(ip)) {
    return new NextResponse(null, {
      status: 429,
      headers: { 'cache-control': 'no-store', 'retry-after': '60' },
    });
  }
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
