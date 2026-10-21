import { expect, test } from '@playwright/test';

test.describe('Price Alert (C-080e1)', () => {
  test('radar: the alert band, city choice, consent never pre-ticked, failure keeps the input', async ({
    page,
  }) => {
    // The navbar's Price Alert lands on the band.
    await page.goto('/dev/drops?stadt=berlin#price-alert');
    const section = page.getByRole('region', { name: 'Verpass keinen Price Drop.' });
    await expect(section).toBeInViewport();

    const city = section.getByLabel('Stadt');
    // The radar's city filter is preselected; "Alle Städte" comes first.
    await expect(city).toHaveValue('berlin');
    await expect(city.locator('option').first()).toHaveText('Alle Städte');
    const consent = section.getByRole('checkbox');
    await expect(consent).not.toBeChecked();
    await expect(section.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      '/datenschutz#6-preisalarm-und-deals-per-e-mail',
    );

    await city.selectOption('zuerich');
    await section.getByLabel('E-Mail', { exact: true }).fill('gast@example.com');
    await consent.check();
    await section.getByRole('button', { name: 'Aktivieren' }).click();
    // Without a database (CI) the request fails gracefully and keeps what was entered.
    await expect(section.getByRole('alert')).toHaveText(
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
    );
    await expect(section.getByLabel('E-Mail', { exact: true })).toHaveValue('gast@example.com');
    await expect(section.getByLabel('Stadt')).toHaveValue('zuerich');
    await expect(section.getByRole('checkbox')).toBeChecked();
  });

  test('gone drops and hotel pages offer "only this hotel" first (C-080k1)', async ({ page }) => {
    // A live drop page has no alert (C-175): the price just dropped.
    await page.goto('/dev/drops?share');
    await expect(page.getByRole('region', { name: 'Price Alert für dieses Hotel' })).toHaveCount(0);

    // The gone-drop page keeps the full form: this hotel first, a whole city one tap away.
    await page.goto('/dev/drops?over');
    const scope = page.getByRole('region', { name: 'Price Alert' }).getByLabel('Alarm für');
    await expect(scope).toHaveValue('hotel:hotel-adlon-kempinski-berlin');
    await expect(scope.locator('option').first()).toHaveText('Nur Hotel Adlon Kempinski');
    await expect(scope.locator('option').nth(1)).toHaveText('Alle Städte');
    await scope.selectOption('berlin');

    await page.goto('/dev/hotel/calendar');
    const onHotel = page.getByRole('region', { name: 'Price Alert für dieses Hotel' });
    await expect(onHotel.locator('input[name="city"]')).toHaveValue(/^hotel:/);
    await onHotel.getByLabel('E-Mail', { exact: true }).fill('gast@example.com');
    await onHotel.getByRole('checkbox').check();
    await onHotel.getByRole('button', { name: 'Price Alert aktivieren' }).click();
    // Without a database (CI) it fails gracefully and keeps the address.
    await expect(onHotel.getByRole('alert')).toHaveText(
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
    );
    await expect(onHotel.getByLabel('E-Mail', { exact: true })).toHaveValue('gast@example.com');
    await expect(onHotel.locator('input[name="city"]')).toHaveValue(/^hotel:/);
  });

  test('manage page: stop only the Price Alert', async ({ page }) => {
    await page.goto('/dev/watch');
    const drops = page.getByRole('region', { name: 'Price Alert' });
    await expect(drops).toContainText(
      'Du bekommst neue Price Drops in Paris, höchstens einmal am Tag.',
    );
    await expect(drops.getByRole('button', { name: 'Price Alert beenden' })).toBeVisible();
    // Followed hotels (C-080k1), each with its own stop button.
    const hotels = drops.getByRole('list', { name: 'Hotels mit Price Alert' });
    await expect(hotels).toContainText(
      'Du bekommst eine E-Mail, wenn Hotel Adlon Kempinski über Nacht deutlich günstiger wird.',
    );
    await expect(
      hotels.getByRole('button', { name: 'Price Alert für Hotel Adlon Kempinski beenden' }),
    ).toBeVisible();
  });

  test('English', async ({ page }) => {
    await page.goto('/en/dev/drops');
    const section = page.getByRole('region', { name: 'Never miss a Price Drop.' });
    await expect(section.getByLabel('City')).toHaveValue('');
    await expect(section.getByRole('button', { name: 'Activate' })).toBeVisible();
  });
});
