import { expect, test, type Page } from '@playwright/test';

// Phone search (C-109): full-screen sheet with Wohin? → Wann? → Wer?. Without a database the
// navbar's index comes from the /dev/search sample.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function openFromNavbar(page: Page) {
  await page.goto('/impressum');
  await page.getByRole('banner').getByRole('button', { name: 'Hotel oder Stadt suchen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Suche' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.describe('phone search', () => {
  test('opens with the field focused, popular cities as a photo row', async ({ page }) => {
    const sheet = await openFromNavbar(page);
    await expect(sheet.getByRole('heading', { name: 'Wohin?' })).toBeVisible();
    const field = sheet.getByRole('combobox', { name: 'Hotel oder Stadt' });
    await expect(field).toBeFocused();
    const popular = sheet.getByRole('group', { name: 'Beliebte Städte' });
    await expect(popular.getByRole('option')).toHaveCount(8);
    // The sheet covers the screen.
    await expect.poll(async () => Math.round((await sheet.boundingBox())?.width ?? 0)).toBe(390);
  });

  test('three steps, back steps back, a stay goes to its page', async ({ page }) => {
    const sheet = await openFromNavbar(page);
    await sheet.getByRole('combobox', { name: 'Hotel oder Stadt' }).fill('sacher');
    await sheet.getByRole('option', { name: /Hotel Sacher Wien/ }).click();
    await expect(sheet.getByRole('heading', { name: 'Wann?' })).toBeVisible();
    // Nightly prices for the picked hotel, all months stacked.
    await expect(sheet.getByRole('gridcell', { name: /pro Nacht/ }).first()).toBeVisible();
    await expect(sheet.getByRole('grid')).not.toHaveCount(1);

    // The phone's back gesture goes one step back, not off the page.
    await page.goBack();
    await expect(sheet.getByRole('heading', { name: 'Wohin?' })).toBeVisible();
    await expect(page).toHaveURL(/\/impressum$/);
    await expect(sheet.getByRole('combobox', { name: 'Hotel oder Stadt' })).toHaveValue(
      'Hotel Sacher Wien',
    );
    await sheet.getByRole('option').first().click(); // popular row: picks a city, on to Wann?
    await expect(sheet.getByRole('heading', { name: 'Wann?' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Zurück' }).click();
    await sheet.getByRole('combobox', { name: 'Hotel oder Stadt' }).fill('sacher');
    await sheet.getByRole('option', { name: /Hotel Sacher Wien/ }).click();

    const cells = sheet.locator('td[data-day]:not([aria-disabled])');
    await cells.nth(3).click();
    await cells.nth(5).click();
    await expect(sheet.getByText(/^2 Nächte · /)).toBeVisible();
    await sheet.getByRole('button', { name: 'Weiter' }).click();
    await expect(sheet.getByRole('heading', { name: 'Wer?' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Ein Erwachsener mehr' }).click();
    await sheet.getByRole('button', { name: 'Preise ansehen' }).click();
    await expect(page).toHaveURL(/\/hotel\/hotel-sacher-wien\/[\d-]+--[\d-]+\?adults=3$/);
  });

  test('nothing picked: says what is missing; ✕ closes and keeps the page', async ({ page }) => {
    const sheet = await openFromNavbar(page);
    await sheet.getByRole('button', { name: 'Preise ansehen' }).click();
    await expect(sheet.getByRole('alert')).toHaveText('Wähl ein Hotel oder eine Stadt.');
    await sheet.getByRole('button', { name: 'Schließen' }).click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/impressum$/);
  });

  test('the homepage shows the "Wohin?" pill instead of the bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('form', { name: 'Preise suchen' })).toBeHidden();
    await page.getByRole('button', { name: /^Wohin\?/ }).click();
    await expect(page.getByRole('dialog', { name: 'Suche' })).toBeVisible();
  });
});
