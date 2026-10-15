import { expect, test } from '@playwright/test';

test.describe('hotel page (C-023a, sample data on /dev/hotel)', () => {
  test('calendar shows every night with its price and level', async ({ page }) => {
    await page.goto('/dev/hotel/calendar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hotel Adlon Kempinski');
    const calendar = page.getByRole('region', { name: 'Preise jeder Nacht' });
    // Two months side by side on desktop (one on phones, see below).
    await expect(calendar.getByRole('grid')).toHaveCount(2);
    const cell = calendar.locator('[data-day="2026-10-16"]');
    await expect(cell).toHaveAccessibleName(
      /Freitag, 16\. Oktober 2026, 737\s€ pro Nacht, (teuer|sehr teuer)/,
    );
    await expect(cell).toContainText('737');
    // A night without a reviewed price says so; past days can't be picked.
    await expect(calendar.locator('[data-day="2026-10-22"]')).toHaveAccessibleName(
      /noch kein Preis/,
    );
    await expect(calendar.locator('[data-day="2026-10-12"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByText('Stand: heute, 10:58 Uhr')).toBeVisible();
  });

  test('picking dates shows the total on one site and links to the stay', async ({ page }) => {
    await page.goto('/dev/hotel/calendar');
    const calendar = page.getByRole('region', { name: 'Preise jeder Nacht' });
    await expect(calendar.getByText('Wähle deine Anreise.')).toBeVisible();
    await calendar.locator('[data-day="2026-10-14"]').click();
    await expect(calendar.getByText('Wähle deine Abreise.')).toBeVisible();
    await calendar.locator('[data-day="2026-10-16"]').click();
    await expect(calendar.getByText(/^2 Nächte · 14\.–16\. Okt\.$/)).toBeVisible();
    await expect(
      calendar.getByText(/^1\.\d{3}\s€ bei Booking\.com, alle Nächte auf derselben Seite$/),
    ).toBeVisible();
    await expect(calendar.getByRole('link', { name: 'Preisverlauf ansehen' })).toHaveAttribute(
      'href',
      '/hotel/hotel-adlon-kempinski-berlin/2026-10-14--2026-10-16?adults=2',
    );
    // A stay over the night without a reviewed price.
    await calendar.getByRole('button', { name: 'Zurücksetzen' }).click();
    await calendar.locator('[data-day="2026-10-21"]').click();
    await calendar.locator('[data-day="2026-10-23"]').click();
    await expect(
      calendar.getByText('Keine Seite hat alle Nächte zusammen angeboten.'),
    ).toBeVisible();
  });

  test('keyboard picks dates on the grid', async ({ page }) => {
    await page.goto('/dev/hotel/calendar');
    const today = page.locator('[data-day="2026-10-13"]');
    await today.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/^2 Nächte · 14\.–16\. Okt\.$/)).toBeVisible();
  });

  test('cheapest 5 nights and week link to their stay pages (C-023b, C-125)', async ({ page }) => {
    await page.goto('/dev/hotel/calendar');
    const best = page.getByRole('region', { name: 'Günstigste Termine' });
    await expect(best.getByRole('listitem')).toHaveCount(2);
    for (const [label, n] of [
      ['5 Nächte', 5],
      ['Eine Woche', 7],
    ] as const) {
      const card = best.getByRole('listitem').filter({ hasText: label });
      const href = await card.getByRole('link').getAttribute('href');
      const m =
        /^\/hotel\/hotel-adlon-kempinski-berlin\/(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})\?adults=2$/.exec(
          href ?? '',
        );
      expect(m, href ?? '').not.toBeNull();
      expect((Date.parse(m?.[2] ?? '') - Date.parse(m?.[1] ?? '')) / 86_400_000).toBe(n);
      await expect(card).toContainText(`${n} Nächte für 2 Erwachsene bei`);
      await expect(card).toContainText(/\d € pro Nacht/);
    }
  });

  test('hotels where single nights mislead show no total', async ({ page }) => {
    await page.goto('/dev/hotel/unreliable');
    // No totals from single nights, so no cheapest dates either.
    await expect(page.getByRole('region', { name: 'Günstigste Termine' })).toHaveCount(0);
    await expect(
      page.getByText(/einzelne Nächte oft anders als ein ganzer Aufenthalt/),
    ).toBeVisible();
    await page.locator('[data-day="2026-10-14"]').click();
    await page.locator('[data-day="2026-10-16"]').click();
    await expect(
      page.getByText('Den Gesamtpreis prüfen wir für genau diese Daten auf der nächsten Seite.'),
    ).toBeVisible();
  });

  test('empty and inactive explain themselves', async ({ page }) => {
    await page.goto('/dev/hotel/empty');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Die Preise jeder Nacht kommen bald' }),
    ).toBeVisible();
    await page.goto('/dev/hotel/inactive');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Dieses Hotel beobachten wir gerade nicht' }),
    ).toBeVisible();
    await expect(page.getByRole('grid')).toHaveCount(0);
  });

  test('English copy and links', async ({ page }) => {
    await page.goto('/en/dev/hotel/calendar');
    const calendar = page.getByRole('region', { name: 'Prices for every night' });
    await calendar.locator('[data-day="2026-10-14"]').click();
    await calendar.locator('[data-day="2026-10-15"]').click();
    await expect(calendar.getByText(/^1 night · 14–15 Oct$/)).toBeVisible();
    await expect(calendar.getByRole('link', { name: 'See price history' })).toHaveAttribute(
      'href',
      '/en/hotel/hotel-adlon-kempinski-berlin/2026-10-14--2026-10-15?adults=2',
    );
  });

  test('fits an iPhone screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dev/hotel/calendar');
    await expect(page.getByRole('grid')).toHaveCount(1);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});

test.describe('hotel route (C-023a)', () => {
  test('without a database it says prices are unavailable', async ({ page }) => {
    await page.goto('/hotel/hotel-adlon-kempinski-berlin');
    await expect(
      page.getByRole('heading', { name: 'Preise gerade nicht erreichbar' }),
    ).toBeVisible();
  });

  test('an invalid slug is a 404', async ({ page }) => {
    const res = await page.goto('/hotel/Not_A_Slug');
    expect(res?.status()).toBe(404);
  });
});
