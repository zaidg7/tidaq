import { expect, test } from '@playwright/test';

test.describe('security headers (C-041a)', () => {
  test('every response carries CSP, HSTS, referrer and framing rules', async ({ page }) => {
    for (const path of ['/', '/methodik', '/dev/stay/tracked', '/gibt-es-nicht']) {
      const res = await page.goto(path);
      const h = res?.headers() ?? {};
      expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'");
      expect(h['content-security-policy'], path).toContain("object-src 'none'");
      expect(h['strict-transport-security'], path).toBe('max-age=31536000; includeSubDomains');
      expect(h['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
      expect(h['x-content-type-options'], path).toBe('nosniff');
      expect(h['x-frame-options'], path).toBe('DENY');
      expect(h['x-powered-by'], path).toBeUndefined();
    }
  });

  test('pages work under the policy: no blocked scripts, styles or images', async ({ page }) => {
    const blocked: string[] = [];
    page.on('console', (m) => {
      if (/Content Security Policy/i.test(m.text())) blocked.push(m.text());
    });
    for (const path of ['/', '/dev/stay/tracked', '/dev/hotel/calendar', '/dev/city', '/en']) {
      await page.goto(path, { waitUntil: 'networkidle' });
    }
    // Client components must hydrate: the search combobox (sample catalog on /dev/ui) reacts.
    await page.goto('/dev/ui');
    const input = page.locator('section#suche').getByRole('combobox', { name: 'Hotel' });
    await input.fill('zuerich');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(blocked).toEqual([]);
  });
});
