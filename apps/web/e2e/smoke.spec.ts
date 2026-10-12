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

const cases = [
  { path: '/', lang: 'de', heading: 'Tidaq kommt bald', switchTo: 'English', target: '/en' },
  { path: '/en', lang: 'en', heading: 'Tidaq is coming soon', switchTo: 'Deutsch', target: '/' },
] as const;

for (const c of cases) {
  test(`home page loads in ${c.lang} without console errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const res = await page.goto(c.path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', c.lang);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.heading);
    expect(errors).toEqual([]);
  });

  test(`locale switch on ${c.path} keeps the page`, async ({ page }) => {
    await page.goto(c.path);
    await page.getByRole('link', { name: c.switchTo }).click();
    await expect(page).toHaveURL(new RegExp(`${c.target === '/' ? '/$' : '/en$'}`));
  });
}

test('sets no cookies', async ({ page, context }) => {
  await page.goto('/');
  await page.goto('/en');
  expect(await context.cookies()).toEqual([]);
});
