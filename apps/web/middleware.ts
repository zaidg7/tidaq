import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // All pages except API routes, Next internals, outbound redirects and files with an extension.
  matcher: ['/((?!api|go|_next|_vercel|.*\\..*).*)'],
};
