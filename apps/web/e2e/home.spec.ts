import { expect, test } from '@playwright/test';

// Homepage (C-020b1). CI has no Supabase: the live example shows the labelled sample.
test.describe('homepage', () => {
  test('hero, proof row and a labelled sample without live data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Ist dein Hotelpreis gerade tief oder hoch?',
    );
    await expect(page.getByText('täglich geprüft')).toBeVisible();
    const live = page.getByRole('region', { name: 'Ist jetzt ein guter Moment zum Buchen?' });
    await expect(live.getByText('Beispieldaten')).toBeVisible();
    await expect(live.getByRole('slider')).toBeVisible();
    await expect(live.getByText('Günstigster')).toBeVisible();
  });

  test('search explains what is missing and focuses the field', async ({ page }) => {
    await page.goto('/');
    const form = page.getByRole('form', { name: 'Preise suchen' });
    await form.getByRole('button', { name: 'Preise ansehen' }).click();
    await expect(form.getByRole('alert')).toHaveText('Wähl ein Hotel.');
    await expect(form.getByLabel('Hotel', { exact: true })).toBeFocused();
  });

  test('the navbar CTA leads to the search card', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Preise ansehen' }).click();
    await expect(page).toHaveURL(/#suche$/);
    await expect(page.getByRole('form', { name: 'Preise suchen' })).toBeInViewport();
  });
});
