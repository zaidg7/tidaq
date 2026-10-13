import type { MetadataRoute } from 'next';

// APP_ENV is a Worker var, read per request.
export const dynamic = 'force-dynamic';

/**
 * Staging is never crawled. Production allows crawling; until launch every page still carries
 * `noindex` (layout metadata), which C-041 removes.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/go/', '/dev/'] } };
}
