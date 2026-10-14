import { expect, test } from '@playwright/test';

test.describe('SEO foundation (C-028a)', () => {
  test('pages carry an absolute canonical and hreflang for both languages', async ({ page }) => {
    await page.goto('/en/impressum');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://tidaq.com/en/impressum',
    );
    const alt = (lang: string) => page.locator(`link[rel="alternate"][hreflang="${lang}"]`);
    await expect(alt('de')).toHaveAttribute('href', 'https://tidaq.com/impressum');
    await expect(alt('en')).toHaveAttribute('href', 'https://tidaq.com/en/impressum');
    await expect(alt('x-default')).toHaveAttribute('href', 'https://tidaq.com/impressum');
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Tidaq');
  });

  test('the homepage describes Tidaq as organization and website', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://tidaq.com',
    );
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json ?? '{}') as { '@graph': { '@type': string }[] };
    expect(data['@graph'].map((n) => n['@type'])).toEqual(['Organization', 'WebSite']);
  });

  test('sitemap lists every static page in both languages with alternates', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBe(true);
    const xml = await res.text();
    // CI has no database: only the 8 static pages, each in DE and EN.
    expect(xml.match(/<url>/g)?.length).toBeGreaterThanOrEqual(16);
    expect(xml).toContain('<loc>https://tidaq.com/en/datenschutz</loc>');
    expect(xml).toContain('hreflang="x-default" href="https://tidaq.com/hotels"');
    expect(xml).not.toContain('/dev/');
  });
});
