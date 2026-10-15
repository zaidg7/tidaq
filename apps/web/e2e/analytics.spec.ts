import { expect, test } from '@playwright/test';

test('Cloudflare Web Analytics only on tidaq.com (C-082)', async ({ page }) => {
  const beacons: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('cloudflareinsights.com')) beacons.push(r.url());
  });
  await page.goto('/');
  // The loader is on every page …
  await expect(page.locator('script#cf-web-analytics')).toHaveCount(1);
  // … but on any other host (local, CI, staging) it adds nothing and sends nothing.
  await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
  expect(beacons).toEqual([]);
});
