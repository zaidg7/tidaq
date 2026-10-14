import { expect, test } from '@playwright/test';

test.describe('price alert pages (C-030a)', () => {
  test('manage page lists alerts with stay links, stop buttons and unsubscribe', async ({
    page,
  }) => {
    await page.goto('/dev/watch');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deine Preisalarme');
    await expect(page.getByText('Für gast@example.com')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Danke, dein Preisalarm ist bestätigt.');
    await expect(page.getByRole('link', { name: 'Hotel Adlon Kempinski' })).toHaveAttribute(
      'href',
      '/hotel/hotel-adlon-kempinski-berlin/2026-12-04--2026-12-06?adults=2',
    );
    await expect(page.getByText(/Alarm bei 1\.000\s€ oder weniger/)).toBeVisible();
    await expect(
      page.getByText('Alarm bei deutlichem Rückgang oder neuem Tiefpunkt'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Alarm für Baur au Lac, 15.–18. Jan. 2027 beenden' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Abbestellen und Adresse löschen' }),
    ).toBeVisible();
  });

  test('an unconfirmed address is told to confirm first', async ({ page }) => {
    await page.goto('/dev/watch?neu');
    await expect(page.getByText(/Diese Adresse ist noch nicht bestätigt/)).toBeVisible();
  });

  test('the confirm page asks for a click, never confirms on open', async ({ page }) => {
    await page.goto('/alarm/bestaetigen?token=00000000-0000-4000-8000-000000000000');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bestätige deinen Preisalarm');
    await expect(page.getByRole('button', { name: 'Alarm bestätigen' })).toBeVisible();
    await page.goto('/alarm/bestaetigen?token=kaputt');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dieser Link gilt nicht mehr');
  });

  test('unknown manage links explain themselves; unsubscribe needs a valid token', async ({
    page,
    request,
  }) => {
    await page.goto('/alarm/verwalten/00000000-0000-4000-8000-000000000000');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Diese Alarme gibt es nicht mehr',
    );
    const bad = await request.post('/api/watch/unsubscribe?token=x', { maxRedirects: 0 });
    expect(bad.status()).toBe(400);
    const open = await request.get(
      '/api/watch/unsubscribe?token=00000000-0000-4000-8000-000000000000',
      { maxRedirects: 0 },
    );
    expect(open.status()).toBe(303);
    expect(open.headers().location).toContain(
      '/alarm/verwalten/00000000-0000-4000-8000-000000000000',
    );
  });
});
