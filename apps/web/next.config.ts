import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@tidaq/core'],
};

export default withNextIntl(nextConfig);

// Makes Cloudflare bindings available in `next dev` (OpenNext guide).
void initOpenNextCloudflareForDev();
