import { Instrument_Sans } from 'next/font/google';

/**
 * Instrument Sans (Clean Premium, PREMIUM.md §3.2): one variable family, weights 400–700, self-hosted
 * by next/font at build time, so visitors never contact Google (D-15). Headings use 600–700; no
 * thin or italic display type.
 */
export const instrumentSans = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-instrument',
  adjustFontFallback: true,
});
