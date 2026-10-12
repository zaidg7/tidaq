import { defaultLocale, locales } from '@tidaq/core';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // German at `/`, English at `/en` (D-05).
  localePrefix: 'as-needed',
  // No Accept-Language redirects and no locale cookie: German is the default for everyone,
  // and we set no cookies at all (D-15).
  localeDetection: false,
  localeCookie: false,
});
