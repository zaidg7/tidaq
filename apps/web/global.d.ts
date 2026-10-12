import type { Locale } from '@tidaq/core';
import type messages from './messages/de.json';

// Type-safe message keys and locales for next-intl.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
