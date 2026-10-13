import { defaultLocale, isLocale, type Locale } from './format';

/**
 * Locale-aware paths for the `as-needed` prefix (D-05): German at `/…`, English at `/en/…`.
 * Shared by server and client so a language link needs no i18n runtime in the browser.
 */

/** Splits `/en/hotels/adlon` into `{ locale: 'en', path: '/hotels/adlon' }`. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const [, first = '', ...rest] = clean.split('/');
  if (isLocale(first) && first !== defaultLocale) {
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
