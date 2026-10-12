import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

/** The canonical host. `www.tidaq.com` permanently redirects here. */
const CANONICAL_HOST = 'tidaq.com';

export default function middleware(request: NextRequest) {
  if (request.headers.get('host') === `www.${CANONICAL_HOST}`) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`https://${CANONICAL_HOST}${pathname}${search}`, 308);
  }
  return intl(request);
}

export const config = {
  // All pages except API routes, Next internals, outbound redirects and files with an extension.
  matcher: ['/((?!api|go|_next|_vercel|.*\\..*).*)'],
};
