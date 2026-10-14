import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@tidaq/core';

// APP_ENV is a Worker var, read per request.
export const dynamic = 'force-dynamic';

/**
 * Staging is never crawled (and its pages send `X-Robots-Tag: noindex`, middleware). Production
 * allows crawling except admin, outbound redirects and dev pages; it's only deployed at launch.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/go/', '/dev/'] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
