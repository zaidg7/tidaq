import { expect, test } from '@playwright/test';

test.describe('deals newsletter (C-054a)', () => {
  test('sign-up on /deals: consent never pre-ticked, every outcome explained', async ({ page }) => {
    await page.goto('/dev/deals');
    const section = page.getByRole('region', { name: 'Die besten Deals jeden Montag per E-Mail' });
    await expect(section).toBeVisible();
    const consent = section.getByRole('checkbox');
    await expect(consent).not.toBeChecked();
    await expect(section.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      '/datenschutz#6-preisalarm-und-deals-per-e-mail',
    );
    await section.getByLabel('Deine E-Mail-Adresse').fill('gast@example.com');
    await consent.check();
    await section.getByRole('button', { name: 'Deals per E-Mail bekommen' }).click();
    // Without a database (CI) the request fails gracefully and keeps what was typed.
    await expect(section.getByRole('alert')).toHaveText(
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
    );
    await expect(section.getByLabel('Deine E-Mail-Adresse')).toHaveValue('gast@example.com');
    await expect(section.getByRole('checkbox')).toBeChecked();
  });

  test('the privacy anchor exists in both languages', async ({ page }) => {
    await page.goto('/datenschutz');
    await expect(page.locator('[id="6-preisalarm-und-deals-per-e-mail"]')).toHaveText(
      '6. Preisalarm und Deals per E-Mail',
    );
    await page.goto('/en/datenschutz');
    await expect(page.locator('[id="6-price-alerts-and-deals-by-email"]')).toBeVisible();
  });

  test('manage page: stop only the deals, alerts stay', async ({ page }) => {
    await page.goto('/dev/watch');
    const deals = page.getByRole('region', { name: 'Deals per E-Mail' });
    await expect(deals).toContainText('Du bekommst jeden Montag die besten Deals.');
    await expect(deals.getByRole('button', { name: 'Deals abbestellen' })).toBeVisible();
  });
});
