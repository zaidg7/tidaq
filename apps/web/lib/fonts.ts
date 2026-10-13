import { Plus_Jakarta_Sans } from 'next/font/google';

/** Plus Jakarta Sans, self-hosted by next/font at build time (DESIGN.md §2, no request to Google at runtime). */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});
