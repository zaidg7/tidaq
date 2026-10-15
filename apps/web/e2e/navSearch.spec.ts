import { expect, test } from '@playwright/test';

// Navbar search (C-107b). Without a database the index route serves the /dev/search sample.
test.describe('navbar search', () => {
  test('the pill opens the search in place, Esc closes the panel then the search', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/impressum');
    const pill = page.locator('.nav-pill');
    await expect(pill).toBeVisible();
    await pill.click();
    const dialog = page.getByRole('dialog', { name: 'Suche' });
    await expect(dialog).toBeVisible();
    const where = dialog.getByRole('combobox', { name: 'Hotel oder Stadt' });
    await expect(where).toBeFocused();
    await expect(dialog.getByRole('group', { name: 'Beliebte Städte' })).toBeVisible();
    await expect(page).toHaveURL(/\/impressum$/); // no jump to the homepage

    await where.fill('wie');
    await expect(dialog.getByRole('option', { name: /^Wien/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(where).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape'); // clears the field
    await page.keyboard.press('Escape'); // closes the search
    await expect(dialog).toBeHidden();
    await expect(pill).toBeFocused();
  });

  test('picking a city from the navbar goes to its page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/methodik');
    await page.locator('.nav-pill').click();
    const dialog = page.getByRole('dialog', { name: 'Suche' });
    await dialog.getByRole('option', { name: 'Berlin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Preis prüfen' }).click();
    await expect(page).toHaveURL(/\/stadt\/berlin$/);
  });

  test('on the homepage the pill appears once the hero search scrolls away', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/');
    const pill = page.locator('.nav-pill');
    await expect(pill).toHaveAttribute('aria-hidden', 'true');
    await page.mouse.wheel(0, 1200);
    await expect(pill).not.toHaveAttribute('aria-hidden');
  });

  test('below 1280 px an icon opens the same search', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/impressum');
    await expect(page.locator('.nav-pill')).toBeHidden();
    await page.getByRole('banner').getByRole('button', { name: 'Hotel oder Stadt suchen' }).click();
    await expect(page.getByRole('dialog', { name: 'Suche' })).toBeVisible();
  });

  test('phones: the icon opens the full-screen search', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/impressum');
    await page.getByRole('banner').getByRole('button', { name: 'Hotel oder Stadt suchen' }).click();
    await expect(page.getByRole('dialog', { name: 'Suche' })).toBeVisible();
    await expect(page).toHaveURL(/\/impressum$/);
  });
});
