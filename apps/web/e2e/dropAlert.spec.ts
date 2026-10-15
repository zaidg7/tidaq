import { expect, test } from '@playwright/test';

test.describe('Preissturz-Alarm (C-080e1)', () => {
  test('radar: jump link, city choice, consent never pre-ticked, failure keeps the input', async ({
    page,
  }) => {
    await page.goto('/dev/drops?stadt=berlin');
    await page.getByRole('link', { name: /Preissturz-Alarm einrichten/ }).click();
    await expect(page).toHaveURL(/#preissturz-alarm$/);
    const section = page.getByRole('region', { name: 'Preissturz-Alarm' });
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
    await section.getByLabel('Deine E-Mail-Adresse').fill('gast@example.com');
    await consent.check();
    await section.getByRole('button', { name: 'Alarm einrichten' }).click();
    // Without a database (CI) the request fails gracefully and keeps what was entered.
    await expect(section.getByRole('alert')).toHaveText(
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
    );
    await expect(section.getByLabel('Deine E-Mail-Adresse')).toHaveValue('gast@example.com');
    await expect(section.getByLabel('Stadt')).toHaveValue('zuerich');
    await expect(section.getByRole('checkbox')).toBeChecked();
  });

  test('drop pages and hotel pages offer "only this hotel" first (C-080k1)', async ({ page }) => {
    await page.goto('/dev/drops?share');
    const section = page.getByRole('region', { name: 'Preissturz-Alarm' });
    const scope = section.getByLabel('Alarm für');
    await expect(scope).toHaveValue('hotel:baur-au-lac-zuerich');
    await expect(scope.locator('option').first()).toHaveText('Nur Baur au Lac');
    await expect(scope.locator('option').nth(1)).toHaveText('Alle Städte');
    await expect(section).toContainText('sobald Baur au Lac über Nacht deutlich günstiger wird');
    // A whole city is still one tap away.
    await scope.selectOption('zuerich');

    await page.goto('/dev/drops?over');
    await expect(
      page.getByRole('region', { name: 'Preissturz-Alarm' }).getByLabel('Alarm für'),
    ).toHaveValue('hotel:hotel-adlon-kempinski-berlin');

    await page.goto('/dev/hotel/calendar');
    const onHotel = page.getByRole('region', { name: 'Preissturz-Alarm' });
    await expect(onHotel.getByLabel('Alarm für')).toHaveValue(/^hotel:/);
    await onHotel.getByLabel('Deine E-Mail-Adresse').fill('gast@example.com');
    await onHotel.getByRole('checkbox').check();
    await onHotel.getByRole('button', { name: 'Alarm einrichten' }).click();
    // Without a database (CI) it fails gracefully and keeps the hotel chosen.
    await expect(onHotel.getByRole('alert')).toHaveText(
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
    );
    await expect(onHotel.getByLabel('Alarm für')).toHaveValue(/^hotel:/);
  });

  test('manage page: stop only the Preissturz-Alarm', async ({ page }) => {
    await page.goto('/dev/watch');
    const drops = page.getByRole('region', { name: 'Preissturz-Alarm' });
    await expect(drops).toContainText(
      'Du bekommst neue Preisstürze in Paris, höchstens einmal am Tag.',
    );
    await expect(drops.getByRole('button', { name: 'Preissturz-Alarm beenden' })).toBeVisible();
    // Followed hotels (C-080k1), each with its own stop button.
    const hotels = drops.getByRole('list', { name: 'Hotels mit Preissturz-Alarm' });
    await expect(hotels).toContainText(
      'Du bekommst eine E-Mail, wenn Hotel Adlon Kempinski über Nacht deutlich günstiger wird.',
    );
    await expect(
      hotels.getByRole('button', { name: 'Preissturz-Alarm für Hotel Adlon Kempinski beenden' }),
    ).toBeVisible();
  });

  test('English', async ({ page }) => {
    await page.goto('/en/dev/drops');
    const section = page.getByRole('region', { name: 'Price drop alert' });
    await expect(section.getByLabel('City')).toHaveValue('');
    await expect(section.getByRole('button', { name: 'Set up alert' })).toBeVisible();
  });
});
