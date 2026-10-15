import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const dev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy (C-041a). Everything is served from our own origin; the only third
 * party is Cloudflare Web Analytics (beacon script and its endpoint, B-015). Inline scripts stay
 * allowed: the App Router streams its payload in inline scripts, and nonces would force every
 * page to render per request. `next dev` also needs eval for fast refresh.
 * Turnstile (C-030c) loads its script and challenge frame from challenges.cloudflare.com.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://cloudflareinsights.com${dev ? ' ws:' : ''}`,
  'frame-src https://challenges.cloudflare.com',
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** Sent with every response (C-041a). HSTS without `preload`: that list is hard to leave. */
export const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@tidaq/core'],
  poweredByHeader: false,
  async redirects() {
    return [
      // Short links for social bios (C-080d): land on the radar with a welcome for that platform.
      ...['tiktok', 'instagram'].flatMap((ref) => [
        { source: `/${ref}`, destination: `/price-drops?ref=${ref}`, permanent: false },
        { source: `/en/${ref}`, destination: `/en/price-drops?ref=${ref}`, permanent: false },
      ]),
      // The radar moved from /preissturz to /price-drops (C-125, Zaid: no "Sturz"); links that
      // were already shared (videos, emails, story images) keep working.
      ...['', '/en'].flatMap((prefix) => [
        { source: `${prefix}/preissturz`, destination: `${prefix}/price-drops`, permanent: true },
        {
          source: `${prefix}/preissturz/:path*`,
          destination: `${prefix}/price-drops/:path*`,
          permanent: true,
        },
      ]),
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);

// Makes Cloudflare bindings available in `next dev` (OpenNext guide).
void initOpenNextCloudflareForDev();
