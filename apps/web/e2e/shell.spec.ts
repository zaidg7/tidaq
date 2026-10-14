import { expect, test } from '@playwright/test';

// App shell (C-020a): navbar, footer, language links, mobile menu, 404, robots.
test.describe('desktop shell', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('shows the navbar links, CTA and footer columns', async ({ page }) => {
    // The homepage hides the navbar CTA while its search card is visible; other pages show it.
    await page.goto('/dev/ui');
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    for (const name of ['Hotels', 'Deals', 'Kassen-Check', 'So funktioniert’s']) {
      await expect(nav.getByRole('link', { name })).toBeVisible();
    }
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Preise ansehen' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tidaq, zur Startseite' })).toHaveAttribute(
      'href',
      '/',
    );
    const footer = page.getByRole('contentinfo');
    for (const name of ['Impressum', 'Datenschutz', 'Affiliate-Hinweis']) {
      await expect(footer.getByRole('link', { name })).toBeVisible();
    }
  });

  test('language links keep the page and use hreflang', async ({ page }) => {
    await page.goto('/en/dev/ui');
    const de = page.getByRole('banner').getByRole('link', { name: 'Deutsch' });
    await expect(de).toHaveAttribute('href', '/dev/ui');
    await expect(de).toHaveAttribute('hreflang', 'de');
    await expect(page.getByRole('link', { name: 'Tidaq, go to the home page' })).toHaveAttribute(
      'href',
      '/en',
    );
  });

  test('skip link jumps to the content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Zum Inhalt springen' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await skip.press('Enter');
    await expect(page.locator('#inhalt')).toBeFocused();
  });
});

test.describe('mobile shell', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('menu opens as a modal sheet and closes with Esc', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeHidden();
    const open = page.getByRole('button', { name: 'Menü öffnen' });
    await open.click();
    const sheet = page.getByRole('dialog', { name: 'Menü' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Kassen-Check' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Menü schließen' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('has no horizontal scroll', async ({ page }) => {
    for (const path of ['/', '/en', '/gibt-es-nicht']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test('unknown pages get the branded 404 in both locales', async ({ page }) => {
  const de = await page.goto('/gibt-es-nicht');
  expect(de?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Diese Seite gibt es nicht');
  await expect(page.getByRole('link', { name: 'Zur Startseite', exact: true })).toHaveAttribute(
    'href',
    '/',
  );

  const en = await page.goto('/en/does-not-exist');
  expect(en?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page doesn't exist");
});

test('robots.txt blocks crawlers outside production', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('Disallow: /');
});

test('outside production pages send X-Robots-Tag noindex instead of a meta tag (C-041b)', async ({
  page,
}) => {
  for (const path of ['/', '/impressum', '/en/methodik', '/does-not-exist']) {
    const res = await page.goto(path);
    expect(res?.headers()['x-robots-tag'], path).toBe('noindex, nofollow');
  }
  // Production pages are indexable: the layout no longer adds noindex.
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});
