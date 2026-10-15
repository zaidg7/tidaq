import { expect, test } from '@playwright/test';

test.describe('city page (C-024, sample data on /dev/city)', () => {
  test('hotel cards with the cheapest weekend, linking to hotel and stay', async ({ page }) => {
    await page.goto('/dev/city');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Fünf-Sterne-Hotels in Berlin',
    );
    await expect(page.getByText(/Wir beobachten 3 Fünf-Sterne-Hotels in Berlin\./)).toBeVisible();
    const cards = page.getByRole('main').getByRole('listitem');
    await expect(cards).toHaveCount(3);

    const adlon = cards.filter({ hasText: 'Hotel Adlon Kempinski' });
    await expect(adlon.getByRole('link', { name: 'Hotel Adlon Kempinski' })).toHaveAttribute(
      'href',
      '/hotel/hotel-adlon-kempinski-berlin',
    );
    await expect(adlon.getByRole('link', { name: '13.–15. Nov. 2026' })).toHaveAttribute(
      'href',
      '/hotel/hotel-adlon-kempinski-berlin/2026-11-13--2026-11-15?adults=2',
    );
    await expect(adlon).toContainText('2 Nächte, 2 Erwachsene, bei Booking.com');
    await expect(adlon).toContainText(/1\.361\s€/);

    await expect(cards.filter({ hasText: 'Waldorf Astoria Berlin' })).toContainText(
      'Noch kein Wochenendpreis',
    );
    await expect(page.getByRole('link', { name: 'Alle Hotels' }).first()).toHaveAttribute(
      'href',
      '/hotels',
    );
  });

  test('the weekend link sits above the card link', async ({ page }) => {
    await page.goto('/dev/city');
    await page.getByRole('link', { name: '13.–15. Nov. 2026' }).click();
    await expect(page).toHaveURL(/\/hotel\/hotel-adlon-kempinski-berlin\/2026-11-13--2026-11-15/);
  });

  test('English copy and phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/dev/city');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Five-star hotels in Berlin');
    await expect(page.getByText('Cheapest weekend').first()).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });

  test('without a database the real route says prices are unavailable', async ({ page }) => {
    await page.goto('/stadt/berlin');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
  });
});

test.describe('all hotels (C-024, sample data on /dev/hotels)', () => {
  test('grouped by region, then city, with links', async ({ page }) => {
    await page.goto('/dev/hotels');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alle Hotels');
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'Deutschland',
      'Europa',
      'Naher Osten',
      'Asien und Pazifik',
    ]);
    const germany = page.getByRole('region', { name: 'Deutschland' });
    await expect(germany.getByRole('link', { name: /^\d Hotels? in/ })).toHaveText([
      'Berlin',
      'München',
    ]);
    await expect(page.getByRole('link', { name: '1 Hotel auf den Malediven' })).toHaveAttribute(
      'href',
      '/stadt/malediven',
    );
    await expect(germany.getByRole('link', { name: 'Hotel Adlon Kempinski' })).toHaveAttribute(
      'href',
      '/hotel/hotel-adlon-kempinski-berlin',
    );
  });

  test('English names and region order', async ({ page }) => {
    await page.goto('/en/dev/hotels');
    await expect(page.getByRole('link', { name: '1 hotel in Vienna' })).toHaveAttribute(
      'href',
      '/en/stadt/wien',
    );
  });

  test('with dates from the search: cheapest total first (C-110)', async ({ page }) => {
    await page.goto('/dev/city?dates');
    await expect(page.getByText('4.–6. Dez. 2026 · 2 Nächte · 2 Erwachsene')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ohne Daten ansehen' })).toHaveAttribute(
      'href',
      '/stadt/berlin',
    );
    const cards = page.getByRole('main').getByRole('listitem');
    await expect(cards.nth(0)).toContainText('The Ritz-Carlton Berlin');
    await expect(cards.nth(0)).toContainText('2 Nächte bei Expedia');
    await expect(cards.nth(0).getByRole('link', { name: 'Preisverlauf ansehen' })).toHaveAttribute(
      'href',
      '/hotel/the-ritz-carlton-berlin/2026-12-04--2026-12-06?adults=2',
    );
    await expect(cards.nth(1)).toContainText('Hotel Adlon Kempinski');
    await expect(cards.nth(2)).toContainText('Für diese Daten noch kein Preis');
  });
});
