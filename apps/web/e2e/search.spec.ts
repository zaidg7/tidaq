import { expect, test, type Locator, type Page } from '@playwright/test';

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

    // Dates by keyboard: the picker opens on today (13 Oct 2026 on /dev/ui).
    await form.getByRole('button', { name: /^Anreise/ }).focus();
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: 'Reisedaten' });
    await expect(picker.getByRole('gridcell', { name: /13\. Oktober 2026, heute/ })).toBeFocused();
    await page.keyboard.press('PageDown'); // 13 Nov
    await page.keyboard.press('PageDown'); // 13 Dec
    for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft'); // 4 Dec
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(picker.getByText('Fr., 4. Dez. – So., 6. Dez. · 2 Nächte')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(form.getByRole('button', { name: /^Anreise/ })).toBeFocused();
    await expect(form.getByRole('button', { name: /^Abreise · 2 Nächte/ })).toHaveAccessibleName(
      'Abreise · 2 Nächte So., 6. Dez.',
    );
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

/** Opens the picker from a date segment and returns it. */
async function openPicker(page: Page, form: Locator, segment: RegExp) {
  await form.getByRole('button', { name: segment }).click();
  const picker = page.getByRole('dialog', { name: 'Reisedaten' });
  await expect(picker).toBeVisible();
  return picker;
}

/** A day cell, after paging forward until its month is on screen. */
async function showDay(picker: Locator, name: RegExp) {
  const cell = picker.getByRole('gridcell', { name });
  for (let i = 0; i < 12 && !(await cell.isVisible()); i++) {
    await picker.getByRole('button', { name: 'Nächster Monat' }).click();
  }
  return cell;
}

async function clickDay(picker: Locator, name: RegExp) {
  await (await showDay(picker, name)).click();
}

test.describe('date range picker (C-021b)', () => {
  test('picks a range with the mouse and counts the nights', async ({ page }) => {
    const form = await searchCard(page);
    const picker = await openPicker(page, form, /^Anreise/);
    await expect(picker.getByText('Wähl deine Anreise.')).toBeVisible();
    // Weeks start on Monday.
    await expect(picker.getByRole('columnheader').first()).toHaveText('Mo');
    await clickDay(picker, /^Freitag, 4\. Dezember 2026/);
    await expect(picker.getByText('Wähl deine Abreise. Bis zu 30 Nächte.')).toBeVisible();
    await clickDay(picker, /^Montag, 7\. Dezember 2026/);
    await expect(picker.getByText('Fr., 4. Dez. – Mo., 7. Dez. · 3 Nächte')).toBeVisible();
    await expect(
      picker.getByRole('gridcell', { name: 'Freitag, 4. Dezember 2026, Anreise' }),
    ).toHaveAttribute('aria-selected', 'true');
    await picker.getByRole('button', { name: 'Fertig' }).click();
    await expect(picker).toBeHidden();
    await expect(form.getByText('Abreise · 3 Nächte')).toBeVisible();
    await expect(form.getByText('Fr., 4. Dez.')).toBeVisible();
  });

  test('blocks past days and stays over 30 nights', async ({ page }) => {
    const form = await searchCard(page);
    const picker = await openPicker(page, form, /^Anreise/);
    const yesterday = picker.getByRole('gridcell', { name: /^Montag, 12\. Oktober 2026/ });
    await expect(yesterday).toHaveAttribute('aria-disabled', 'true');
    await yesterday.click({ force: true }); // aria-disabled: Playwright would wait for it
    await expect(picker.getByText('Wähl deine Anreise.')).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Vorheriger Monat' })).toBeDisabled();

    await clickDay(picker, /^Sonntag, 1\. November 2026/);
    const tooLong = await showDay(picker, /^Mittwoch, 2\. Dezember 2026/);
    await expect(tooLong).toHaveAttribute('aria-disabled', 'true'); // 31 nights
    await clickDay(picker, /^Dienstag, 1\. Dezember 2026/); // 30 nights
    await expect(picker.getByText(/· 30 Nächte$/)).toBeVisible();
  });

  test('opens on the check-out and keeps a check-out that still fits', async ({ page }) => {
    const form = await searchCard(page);
    let picker = await openPicker(page, form, /^Anreise/);
    await clickDay(picker, /^Freitag, 4\. Dezember 2026/);
    await clickDay(picker, /^Sonntag, 6\. Dezember 2026/);
    await page.keyboard.press('Escape');

    // From "Abreise" the next click changes the check-out.
    picker = await openPicker(page, form, /^Abreise/);
    await expect(
      picker.getByRole('gridcell', { name: /6\. Dezember 2026, Abreise/ }),
    ).toBeFocused();
    await clickDay(picker, /^Mittwoch, 9\. Dezember 2026/);
    await expect(picker.getByText(/· 5 Nächte$/)).toBeVisible();

    // Reset clears both dates.
    await picker.getByRole('button', { name: 'Zurücksetzen' }).click();
    await expect(picker.getByText('Wähl deine Anreise.')).toBeVisible();
    await picker.getByRole('button', { name: 'Schließen' }).click();
    await expect(form.getByRole('button', { name: /^Abreise/ })).toHaveAccessibleName(
      'Abreise Datum wählen',
    );
  });

  test('is a bottom sheet on an iPhone, without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const form = await searchCard(page);
    const picker = await openPicker(page, form, /^Anreise/);
    await expect(picker.getByRole('grid')).toHaveCount(1);
    expect((await picker.boundingBox())?.width).toBe(390);
    // Flush with the bottom edge once the slide-up has finished.
    await expect
      .poll(async () => {
        const b = await picker.boundingBox();
        return Math.round((b?.y ?? 0) + (b?.height ?? 0));
      })
      .toBe(844);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
    // A tap on the backdrop closes it.
    await page.mouse.click(195, 20);
    await expect(picker).toBeHidden();
  });

  test('shows two months from 768 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const form = await searchCard(page);
    const picker = await openPicker(page, form, /^Anreise/);
    await expect(picker.getByRole('grid')).toHaveCount(2);
    await expect(picker.getByRole('heading', { name: 'Oktober 2026' })).toBeVisible();
    await expect(picker.getByRole('heading', { name: 'November 2026' })).toBeVisible();
  });
});
