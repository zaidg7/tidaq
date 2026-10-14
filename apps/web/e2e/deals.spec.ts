import { expect, test } from '@playwright/test';

test.describe('deals page (C-025, sample data on /dev/deals)', () => {
  test('biggest drop first, cards link to their stays, city chips', async ({ page }) => {
    await page.goto('/dev/deals');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Fünf-Sterne-Hotels, die gerade günstiger sind',
    );
    const main = page.getByRole('main');
    const cards = main.getByRole('list').last().getByRole('listitem');
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText('Baur au Lac');
    await expect(cards.first().getByRole('link', { name: 'Baur au Lac' })).toHaveAttribute(
      'href',
      '/hotel/baur-au-lac-zuerich/2026-11-20--2026-11-22?adults=2',
    );

    const chips = main.getByRole('navigation', { name: 'Nach Stadt filtern' });
    await expect(chips.getByRole('link')).toHaveText(['Alle Städte', 'Berlin', 'Zürich']);
    await expect(chips.getByRole('link', { name: 'Alle Städte' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(chips.getByRole('link', { name: 'Berlin' })).toHaveAttribute(
      'href',
      '/deals?stadt=berlin',
    );
  });

  test('a city filter shows only that city', async ({ page }) => {
    await page.goto('/dev/deals?stadt=berlin');
    const main = page.getByRole('main');
    await expect(main.getByRole('list').last().getByRole('listitem')).toHaveCount(2);
    await expect(
      main.getByRole('navigation').getByRole('link', { name: 'Berlin' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('no deals: an honest empty state with a way on', async ({ page }) => {
    await page.goto('/dev/deals?empty');
    await expect(page.getByRole('heading', { name: 'Gerade gibt es keine Deals' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alle Hotels ansehen' })).toHaveAttribute(
      'href',
      '/hotels',
    );
  });

  test('without a database the real page says it is unavailable', async ({ page }) => {
    await page.goto('/deals');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
  });

  test('English and phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/dev/deals');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Five-star hotels that are cheaper right now',
    );
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});
