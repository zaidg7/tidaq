import { expect, test } from '@playwright/test';

test.describe('all cities (C-134, sample data on /dev/cities)', () => {
  test('regions as bento grids that end flush, countries above the names', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dev/cities');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '13 Städte. Ein Blick auf die Preise.',
    );
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'Deutschland',
      'Europa',
      'Naher Osten',
      'Asien und Pazifik',
    ]);
    await expect(page.getByRole('link', { name: 'Europa' })).toHaveAttribute(
      'href',
      '#region-europe',
    );
    const europe = page.getByRole('region', { name: 'Europa' });
    // Most drops today leads; the country sits above each name.
    await expect(europe.getByRole('link').first()).toContainText('FrankreichParis');
    // No redundant country: not in Germany, not when it contains the city name.
    await expect(page.getByRole('region', { name: 'Deutschland' })).not.toContainText(
      'DeutschlandBerlin',
    );
    await expect(page.getByRole('region', { name: 'Asien und Pazifik' })).not.toContainText(
      'Sonderverwaltungsregion',
    );

    // Every region's grid ends flush: each row's last tile reaches the grid's right edge.
    for (const name of ['Deutschland', 'Europa', 'Naher Osten', 'Asien und Pazifik']) {
      const gaps = await page
        .getByRole('region', { name })
        .getByRole('list')
        .evaluate((ul) => {
          const right = ul.getBoundingClientRect().right;
          const tiles = [...ul.children].map((li) => li.getBoundingClientRect());
          const rows = new Map<number, number>();
          for (const r of tiles)
            rows.set(Math.round(r.bottom), Math.max(rows.get(Math.round(r.bottom)) ?? 0, r.right));
          return [...rows.values()].filter((r) => Math.abs(r - right) > 2).length;
        });
      expect(gaps, name).toBe(0);
    }
  });

  test('phone width: no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/dev/cities');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '13 cities. One look at the prices.',
    );
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});
