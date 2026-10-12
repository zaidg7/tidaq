import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  transpilePackages: ['@tidaq/core'],
};

export default nextConfig;

// Makes Cloudflare bindings available in `next dev` (OpenNext guide).
void initOpenNextCloudflareForDev();
