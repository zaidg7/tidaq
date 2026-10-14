import { expect, test } from '@playwright/test';

test.describe('provider pages (C-034, sample data on /dev/provider)', () => {
  test('tested provider: score, test counts, extras, grid shares', async ({ page }) => {
    await page.goto('/dev/provider?p=booking-com');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Booking.com');
    await expect(page.getByText('Preistreue 78 von 100')).toBeAttached();

    const tests = page.getByRole('definition').filter({ hasText: /^12$/ });
    await expect(tests).toHaveCount(1);
    await expect(page.getByText('+2,4 %')).toBeVisible();
    await expect(page.getByText('Tests vom 16. Okt. 2026 bis 2. Nov. 2026')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Citytax extra' })).toContainText(
      'in 2 Tests',
    );

    await expect(page.getByText('76 von 83')).toBeVisible();
    await expect(page.getByText('42 %', { exact: true })).toBeVisible();
    await expect(page.getByText('6,6 % teurer')).toBeVisible();

    const others = page.getByRole('navigation', { name: 'Andere Anbieter' });
    await expect(others.getByRole('link', { name: 'Agoda' })).toHaveAttribute(
      'href',
      '/anbieter/agoda',
    );
    await expect(others.getByRole('link', { name: 'Direkt beim Hotel' })).toBeVisible();
    await expect(others.getByRole('link', { name: 'So rechnen wir' })).toHaveAttribute(
      'href',
      '/methodik',
    );
  });

  test('few tests: no score yet; untested: says so', async ({ page }) => {
    await page.goto('/dev/provider?p=trip-com');
    await expect(
      page.getByText('3 Kassen-Tests bisher. Eine Zahl zeigen wir ab 5 Tests.'),
    ).toBeVisible();
    await expect(page.getByText(/Preistreue \d+ von 100/)).toHaveCount(0);

    await page.goto('/dev/provider?p=agoda');
    await expect(
      page.getByText(
        'Für Agoda gibt es noch keine Kassen-Tests. Ab 5 Tests zeigen wir hier die Preistreue.',
      ),
    ).toBeVisible();
  });

  test('tested but no grid prices: explains why it is missing', async ({ page }) => {
    await page.goto('/dev/provider?p=expedia');
    await expect(
      page.getByText(/Unsere Preisquelle zeigt für Expedia gerade keine Preise/),
    ).toBeVisible();
  });

  test('English copy, direct channel name and phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/dev/provider?p=hotel-direct');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Direct with the hotel');
    await expect(page.getByText('Price accuracy at checkout')).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });

  test('live numbers block for /methodik', async ({ page }) => {
    await page.goto('/dev/provider?p=method');
    await expect(page.getByRole('heading', { name: 'Aktuelle Zahlen' })).toBeVisible();
    // 3.181 of 4.712 stays within 3 %.
    await expect(page.getByText('68 %', { exact: true })).toBeVisible();
    const list = page.getByRole('heading', { name: 'Die Anbieter in unseren Daten' });
    await expect(list).toBeVisible();
    await expect(page.getByRole('link', { name: 'Booking.com' })).toHaveAttribute(
      'href',
      '/anbieter/booking-com',
    );
    await expect(page.getByText('Am günstigsten in 72 % der Nächte')).toBeVisible();
    await expect(page.getByText('Gerade keine Preise in unserer Quelle')).toBeVisible();
  });

  test('without a database: provider route says unavailable, /methodik keeps its text', async ({
    page,
  }) => {
    await page.goto('/anbieter/booking-com');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
    await page.goto('/methodik');
    await expect(
      page.getByText('Die aktuellen Zahlen sind gerade nicht erreichbar.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wann ein Preis gut ist' })).toBeVisible();
  });

  test('bad slugs are a 404', async ({ page }) => {
    const res = await page.goto('/anbieter/Booking.com');
    expect(res?.status()).toBe(404);
  });

  test('stay table: the trust score opens the provider page, above the phone row link (C-034b)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dev/stay/tracked');
    const link = page.getByRole('link', { name: /Preistreue von Booking\.com im Detail/ });
    await expect(link).toHaveAttribute('href', '/anbieter/booking-com');
    // Agoda has no slug in the sample: plain score, no link.
    await expect(page.getByRole('link', { name: /Preistreue von Agoda/ })).toHaveCount(0);
    await link.click();
    await expect(page).toHaveURL(/\/anbieter\/booking-com$/);
  });
});
