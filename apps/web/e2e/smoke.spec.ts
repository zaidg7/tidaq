import { expect, test, type Page } from '@playwright/test';

/** Collects console errors and uncaught page errors while a test runs. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('home page loads in German without console errors', async ({ page }) => {
  const errors = trackErrors(page);
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tidaq kommt bald');
  expect(errors).toEqual([]);
});
