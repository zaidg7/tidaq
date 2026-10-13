import { expect, test } from '@playwright/test';

// The component gallery (C-006). Hidden on production (APP_ENV=production); e2e runs without it.
test.describe('/dev/ui', () => {
  test('renders every component without console errors and is not indexed', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto('/dev/ui');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Komponenten');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.getByText('Daten werden gesammelt (3/7)')).toBeVisible();
    await expect(page.getByText('Noch zu wenig Tests').first()).toBeVisible();
    await expect(page.getByText('5 % unter dem 30-Tage-Schnitt')).toBeVisible();
    await expect(page.getByText('12 % unter dem Schnitt seit 1. Okt.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Tidaq' }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('uses Plus Jakarta Sans and the Soft Modern background', async ({ page }) => {
    await page.goto('/dev/ui');
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { font: s.fontFamily, bg: getComputedStyle(document.documentElement).backgroundColor };
    });
    expect(style.font).toMatch(/Jakarta/i);
    expect(style.bg).toBe('rgb(245, 243, 252)');
  });

  test('shows a visible focus ring on keyboard focus', async ({ page }) => {
    await page.goto('/dev/ui');
    const button = page.getByRole('button', { name: 'Preise ansehen', exact: true }).first();
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const outline = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
    });
    expect(outline).toBe('solid 2px rgb(106, 73, 224)');
  });

  test('links field errors to the input for screen readers', async ({ page }) => {
    await page.goto('/dev/ui');
    const input = page.locator('#dev-email-error');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription(/fehlt etwas nach dem @/);
  });

  test('marks a loading button as busy and keeps it out of the click path', async ({ page }) => {
    await page.goto('/dev/ui');
    const busy = page.locator('button[aria-busy="true"]');
    await expect(busy).toHaveCount(1);
    await expect(busy).toHaveAccessibleName('Preis beobachten');
    expect(await busy.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  });

  test('names icon-only buttons', async ({ page }) => {
    await page.goto('/dev/ui');
    await expect(page.getByRole('button', { name: 'Suche öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menü öffnen' })).toBeVisible();
  });
});
