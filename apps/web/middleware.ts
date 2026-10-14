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
  // The admin area has no locales; its pages guard themselves (lib/admin/session.ts).
  const admin =
    request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/');
  const response = admin ? NextResponse.next() : intl(request);
  // Staging and previews are never indexed (C-041b). A header, not page metadata: APP_ENV is a
  // Worker var, read per request, while legal pages are prerendered at build time.
  if (process.env.APP_ENV !== 'production') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  // All pages except API routes, Next internals, outbound redirects and files with an extension.
  matcher: ['/((?!api|go|_next|_vercel|.*\\..*).*)'],
};
