import { expect, test } from '@playwright/test';

// Homepage (mockup B, C-115). Tests run without Supabase: sections that need live data leave
// themselves out, the result card shows its labelled example.
test.describe('homepage', () => {
  test('photo hero with the headline, search and proof line', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Luxushotels buchen, wenn der Preis fällt.',
    );
    await expect(page.getByText(/^Wir prüfen jeden Morgen die Preise/).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preis prüfen' })).toBeVisible();
    await expect(page.getByText('Kostenlos, ohne Konto')).toBeVisible();
    // No live data: no Price Drops, no city tiles, no empty frames.
    await expect(page.getByRole('heading', { name: 'Price Drops heute' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Beliebte Ziele' })).toHaveCount(0);
  });

  test('navbar is white on the photo and turns ink once the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const header = page.locator('.site-header');
    const brand = header.getByRole('link', { name: 'Tidaq, zur Startseite' });
    await expect(brand).toHaveCSS('color', 'rgb(255, 255, 255)');
    // The hero search is on screen: the navbar has no search button (and no gap for it).
    await expect(header.getByRole('button', { name: 'Hotel oder Stadt suchen' })).toBeHidden();
    await page.mouse.wheel(0, 1200);
    await expect(header).toHaveAttribute('data-scrolled', '');
    await expect(brand).toHaveCSS('color', 'rgb(21, 19, 28)');
    await expect(header.getByRole('button', { name: 'Hotel oder Stadt suchen' })).toBeVisible();
  });

  test('phones: the "Wohin?" pill sits in the photo, the navbar shows no search icon yet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^Wohin\?/ })).toBeVisible();
    const header = page.locator('.site-header');
    await expect(header.getByRole('button', { name: 'Hotel oder Stadt suchen' })).toBeHidden();
    await page.mouse.wheel(0, 900);
    await expect(header.getByRole('button', { name: 'Hotel oder Stadt suchen' })).toBeVisible();
  });

  test('result card: a labelled example with the three-zone meter', async ({ page }) => {
    await page.goto('/');
    const result = page.getByRole('region', { name: 'Grün heißt: jetzt buchen.' });
    await expect(result.getByText('Beispiel', { exact: true })).toBeVisible();
    await expect(result.getByText(/^Beispiel mit erfundenen Preisen/)).toBeVisible();
    await expect(result.getByRole('img', { name: /^Günstig: aktuell 3\.170/ })).toBeVisible();
    await expect(result.getByText('Gerade günstig')).toBeVisible();
  });

  test('Price Alert: one line with email and city, consent never pre-ticked', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const alert = page.getByRole('region', { name: 'Verpass keinen Price Drop.' });
    await expect(alert.getByLabel('E-Mail', { exact: true })).toBeVisible();
    await expect(alert.getByLabel('Stadt')).toHaveValue('');
    await expect(alert.getByRole('checkbox')).not.toBeChecked();
    await expect(alert.getByRole('button', { name: 'Aktivieren' })).toBeVisible();
  });
});

test('hotel photos are served from our own domain (C-011c)', async ({ request }) => {
  for (const file of [
    'hotel-adlon-kempinski-berlin-160.webp',
    'hotel-adlon-kempinski-berlin-960.webp',
  ]) {
    const res = await request.get(`/hotels/${file}`);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type'], file).toContain('image/webp');
  }
});
