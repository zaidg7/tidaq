import { expect, test } from '@playwright/test';

test.describe('city page (C-024, sample data on /dev/city)', () => {
  test('hotel cards link to the hotel page; no suggested dates (C-173)', async ({ page }) => {
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
    await expect(adlon).toContainText('Wähl deine Daten, dann siehst du den Preis.');
    await expect(page.getByText('Günstigste Woche')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Alle Hotels' }).first()).toHaveAttribute(
      'href',
      '/hotels',
    );
  });

  test('English copy and phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/dev/city');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Five-star hotels in Berlin');
    await expect(page.getByText('Pick your dates to see the price.').first()).toBeVisible();
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
      /^Berlin/,
      /^München/,
    ]);
    await expect(page.getByRole('link', { name: '1 Hotel auf den Malediven' })).toHaveAttribute(
      'href',
      '/stadt/malediven',
    );
    // C-131: names carry the city unless they already say it.
    await expect(
      germany.getByRole('link', { name: 'Hotel Adlon Kempinski, Berlin' }),
    ).toHaveAttribute('href', '/hotel/hotel-adlon-kempinski-berlin');
    await expect(germany.getByRole('link', { name: 'Mandarin Oriental Munich' })).toBeVisible();
  });

  test('each region is a carousel: three cards, arrows move one card (C-131)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dev/hotels');
    const germany = page.getByRole('region', { name: 'Deutschland' });
    const list = germany.getByRole('list', { name: 'Hotels in Deutschland' });
    await expect(list.getByRole('listitem')).toHaveCount(4);
    await expect(germany.getByRole('button', { name: 'Zurück' })).toHaveCount(0);
    await germany.getByRole('button', { name: 'Weiter' }).click();
    await expect(germany.getByRole('button', { name: 'Zurück' })).toBeVisible();
    // One card further is the end: the next arrow goes away.
    await expect(germany.getByRole('button', { name: 'Weiter' })).toHaveCount(0);
    await expect.poll(() => list.evaluate((e) => e.scrollLeft)).toBeGreaterThan(300);
    // Europe has one hotel: no arrows at all.
    await expect(page.getByRole('region', { name: 'Europa' }).getByRole('button')).toHaveCount(0);
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
    // The whole card opens that stay too: the dates from the search are never asked again.
    await expect(
      cards.nth(0).getByRole('link', { name: 'The Ritz-Carlton Berlin' }),
    ).toHaveAttribute('href', '/hotel/the-ritz-carlton-berlin/2026-12-04--2026-12-06?adults=2');
    await expect(cards.nth(1)).toContainText('Hotel Adlon Kempinski');
    await expect(cards.nth(2)).toContainText('Für diese Daten noch kein Preis');
  });
});
