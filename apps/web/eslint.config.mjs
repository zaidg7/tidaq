import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next',
      '.open-next',
      '.wrangler',
      'next-env.d.ts',
      'cloudflare-env.d.ts',
      'playwright-report',
      'test-results',
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    // New React Compiler rules in eslint-config-next 16 (C-163). They flag 9 working spots in the
    // search popovers and calendars (ref reads in render, setState in effects); warnings until
    // those are refactored and checked on phone and desktop (C-164).
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
