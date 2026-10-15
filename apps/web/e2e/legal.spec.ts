import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '/impressum', de: 'Impressum', en: 'Imprint', footer: 'Impressum' },
  { path: '/datenschutz', de: 'Datenschutzerklärung', en: 'Privacy policy', footer: 'Datenschutz' },
  {
    path: '/affiliate-hinweis',
    de: 'Affiliate-Hinweis',
    en: 'Affiliate disclosure',
    footer: 'Affiliate-Hinweis',
  },
  { path: '/ranking', de: 'So sortieren wir', en: 'How we sort', footer: 'So sortieren wir' },
  {
    path: '/methodik',
    de: 'So funktioniert Tidaq',
    en: 'How Tidaq works',
    footer: 'So funktioniert’s',
  },
];

test.describe('legal and transparency pages (C-027)', () => {
  for (const p of PAGES) {
    test(`${p.path} in German and English`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.de);
      // Each page carries its own date (the privacy page changes with features).
      await expect(page.getByText(/^Stand: \d{1,2}\. \p{L}+ 20\d\d$/u)).toBeVisible();
      await expect(page.getByText(/German version is legally binding/)).toHaveCount(0);
      await expect(page.locator('main, article').first()).not.toContainText('TMG');

      await page.goto(`/en${p.path}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.en);
      await expect(page.getByText(/The German version is legally binding\./)).toBeVisible();
    });
  }

  test('every page is linked in the footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    for (const p of PAGES) {
      await expect(footer.getByRole('link', { name: p.footer, exact: true })).toHaveAttribute(
        'href',
        p.path,
      );
    }
  });

  test('the imprint names the operator under § 5 DDG', async ({ page }) => {
    await page.goto('/impressum');
    await expect(page.getByRole('heading', { name: /^Angaben gemäß §\s5 DDG$/ })).toBeVisible();
    await expect(page.getByText('Prinz-Heinrich-Straße 17').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'zaidghazal216@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:zaidghazal216@gmail.com',
    );
    await expect(page.getByText(/§\s19 UStG/)).toBeVisible();
  });

  test('internal links keep the language, and pages fit an iPhone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/affiliate-hinweis');
    await expect(
      page.getByRole('article').getByRole('link', { name: 'how we sort' }),
    ).toHaveAttribute('href', '/en/ranking');
    for (const p of PAGES) {
      await page.goto(p.path);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, p.path).toBeLessThanOrEqual(390);
    }
  });
});
