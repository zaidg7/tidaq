import { expect, test, type Page } from '@playwright/test';

/** Search card on /dev/ui with a sample catalog (CI has no database). */
async function searchCard(page: Page) {
  await page.goto('/dev/ui');
  return page.locator('section#suche').getByRole('form', { name: 'Preise suchen' });
}

test.describe('search autocomplete (C-021a)', () => {
  test('finds Zürich without the umlaut and announces the result count', async ({ page }) => {
    const form = await searchCard(page);
    const input = form.getByRole('combobox', { name: 'Hotel' });
    await input.fill('zuerich');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = form.getByRole('listbox', { name: 'Hotels' }).getByRole('option');
    await expect(options).toHaveText(['Baur au Lac', 'The Dolder Grand']);
    await expect(form.getByText('2 Hotels gefunden')).toBeAttached();

    await input.fill('xyz');
    await expect(form.getByRole('listbox')).toContainText('Kein Hotel gefunden');
  });

  test('a full search works with the keyboard only', async ({ page }) => {
    const form = await searchCard(page);
    const input = form.getByRole('combobox', { name: 'Hotel' });
    await input.focus();
    await page.keyboard.type('adlon');
    await page.keyboard.press('ArrowDown'); // the first match is already active; wraps to itself
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Hotel Adlon Kempinski');
    await expect(input).toHaveAttribute('aria-expanded', 'false');

    await form.getByLabel('Anreise').fill('2026-12-04');
    await form.getByLabel(/^Abreise/).fill('2026-12-06');
    await form.getByLabel('Gäste').selectOption('3');
    await form.getByRole('button', { name: 'Preise ansehen' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(
      /\/hotel\/hotel-adlon-kempinski-berlin\/2026-12-04--2026-12-06\?adults=3$/,
    );
  });

  test('Escape closes, then clears; a click picks without losing focus', async ({ page }) => {
    const form = await searchCard(page);
    const input = form.getByRole('combobox', { name: 'Hotel' });
    await input.fill('rom');
    await page.keyboard.press('Escape');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Escape');
    await expect(input).toHaveValue('');

    await input.click();
    await form.getByRole('option', { name: 'Baur au Lac' }).click();
    await expect(input).toHaveValue('Baur au Lac');
    await expect(input).toBeFocused();
    await expect(form.getByRole('option', { name: 'Baur au Lac' })).toBeHidden();
  });

  test('typing an exact name and leaving the field picks the hotel', async ({ page }) => {
    const form = await searchCard(page);
    await form.getByRole('combobox', { name: 'Hotel' }).fill('hotel de rome');
    await page.keyboard.press('Tab');
    await form.getByRole('button', { name: 'Preise ansehen' }).click();
    // No "Wähl ein Hotel." error: the hotel counts as chosen; the dates are what's missing.
    await expect(form.getByRole('alert')).toHaveText('Wähl Anreise und Abreise.');
  });

  test('fits an iPhone screen with the list open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const form = await searchCard(page);
    await form.getByRole('combobox', { name: 'Hotel' }).click();
    await expect(form.getByRole('listbox', { name: 'Hotels' }).getByRole('option')).toHaveCount(5);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});
