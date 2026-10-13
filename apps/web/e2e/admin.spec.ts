import { expect, test } from '@playwright/test';

/**
 * Admin auth (C-020c) without a real login: the guard, the error states, CSRF and cookie scope.
 * CI has no Supabase config, so the guard answers "not set up" there; locally with env it
 * answers with the plain login page. Both must keep the page closed.
 */

test('the admin page sends you to the login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(page.getByLabel('E-Mail')).toHaveAttribute('type', 'email');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByText('Angemeldet als')).toHaveCount(0);
});

test('a forged session cookie does not open the admin page', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'tidaq_admin_at', value: 'forged', url: `${baseURL}/admin` }]);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText('Angemeldet als')).toHaveCount(0);
});

test('public pages set no cookies', async ({ page, context }) => {
  for (const path of ['/', '/en', '/admin/login']) {
    const res = await page.goto(path);
    expect(res?.headers()['set-cookie'], path).toBeUndefined();
  }
  expect(await context.cookies()).toEqual([]);
});

test('login and logout reject cross-site posts', async ({ request }) => {
  for (const path of ['/admin/auth/login', '/admin/auth/logout']) {
    const res = await request.post(path, {
      form: { email: 'someone@example.com' },
      headers: { origin: 'https://evil.example' },
      maxRedirects: 0,
    });
    expect(res.status(), path).toBe(403);
  }
});

test('an invalid address gets a clear error', async ({ request, baseURL }) => {
  const res = await request.post('/admin/auth/login', {
    form: { email: 'keine-adresse' },
    headers: { origin: baseURL as string },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toContain('/admin/login?error=email');
});

test('broken or foreign links explain what to do', async ({ page }) => {
  await page.goto('/admin/auth/callback');
  await expect(page).toHaveURL(/error=link/);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('abgelaufen');

  await page.goto('/admin/auth/callback?code=abc');
  await expect(page).toHaveURL(/error=browser/);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('selben Browser');

  await page.goto('/admin/auth/refresh?next=//evil.example');
  await expect(page).toHaveURL(/\/admin\/login\?error=expired/);
});

test('unknown admin paths show the admin 404', async ({ page }) => {
  const res = await page.goto('/admin/gibt-es-nicht');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /Admin-Seite gibt es nicht/ })).toBeVisible();
});
