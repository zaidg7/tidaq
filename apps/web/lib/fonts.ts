import { Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Plus Jakarta Sans as a variable font (one file, weights 200–800), self-hosted by next/font at
 * build time: no request to Google at runtime. Weights in use: 500, 600, 700, 800 (CRAFT.md §2).
 */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-jakarta',
});
