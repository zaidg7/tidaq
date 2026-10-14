import { defaultLocale, isLocale, type Locale } from './format';

/**
 * Locale-aware paths for the `as-needed` prefix (D-05): German at `/…`, English at `/en/…`.
 * Shared by server and client so a language link needs no i18n runtime in the browser.
 */

/**
 * Splits `/en/hotels/adlon` into `{ locale: 'en', path: '/hotels/adlon' }`. A `/de` prefix is
 * stripped too: the middleware rewrites German pages to `/de/…` internally, and Next's
 * `usePathname()` can report that internal path.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const [, first = '', ...rest] = clean.split('/');
  if (isLocale(first)) {
    return { locale: first, path: `/${rest.join('/')}` };
  }
  return { locale: defaultLocale, path: clean };
}

/** The same page in `locale`: `localizedPath('/en/deals', 'de')` → `/deals`. */
export function localizedPath(pathname: string, locale: Locale): string {
  const { path } = splitLocale(pathname);
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (locale === defaultLocale) return trimmed || '/';
  return trimmed === '/' ? `/${locale}` : `/${locale}${trimmed}`;
}

/**
 * Canonical URL and hreflang alternates of a page (C-028a), for Next's `metadata.alternates`:
 * the page in `locale`, both language versions, and German as `x-default` (D-05).
 */
export function alternatesFor(
  pathname: string,
  locale: Locale,
): { canonical: string; languages: Record<'de' | 'en' | 'x-default', string> } {
  const de = localizedPath(pathname, 'de');
  return {
    canonical: localizedPath(pathname, locale),
    languages: { de, en: localizedPath(pathname, 'en'), 'x-default': de },
  };
}
