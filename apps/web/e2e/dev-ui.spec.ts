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
    await expect(page.getByText('Daten werden gesammelt (3/7)').first()).toBeVisible();
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

  test('price chart: keyboard readout by day and table fallback', async ({ page }) => {
    await page.goto('/dev/ui');
    const section = page.locator('#preisverlauf');
    const chart = section.getByRole('slider').first();
    await expect(section.getByRole('img').first()).toHaveAccessibleName(
      /^Preisverlauf über 58 Tage: Tief/,
    );
    // At rest the slider already names today's price.
    await expect(chart).toHaveAttribute(
      'aria-valuetext',
      /^13\. Okt\.: [\d.]+\s€, Booking\.com, heute$/,
    );
    await chart.focus();
    await page.keyboard.press('Home');
    await expect(chart).toHaveAttribute('aria-valuetext', /^15\. Aug\.: /);
    // Day 22 and 23 have no price: the slider steps by day and says so.
    for (let i = 0; i < 22; i++) await page.keyboard.press('ArrowRight');
    await expect(chart).toHaveAttribute('aria-valuetext', '6. Sept.: kein Preis');
    await page.keyboard.press('PageDown');
    await expect(chart).toHaveAttribute('aria-valuenow', '29');
    await page.keyboard.press('Escape');
    await expect(chart).toHaveAttribute('aria-valuenow', '59');

    const table = section.locator('details').first();
    await table.getByText('Als Tabelle anzeigen').click();
    await expect(table.getByText('Tabelle ausblenden')).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(60);
    await expect(table.locator('tbody tr').first()).toContainText('13. Okt.');
    await expect(table.locator('tbody tr').filter({ hasText: 'kein Preis' })).toHaveCount(2);
  });

  test('price chart: sparse, empty, stale and outlier states', async ({ page }) => {
    await page.goto('/dev/ui');
    const section = page.locator('#preisverlauf');
    await expect(section.getByText('Hier entsteht dein Verlauf')).toHaveCount(1);
    await expect(
      section.getByRole('img', { name: 'Noch keine Preise für diesen Aufenthalt.' }),
    ).toBeVisible();
    await expect(section.getByText('Keine Daten seit 8. Okt.')).toBeVisible();
    await expect(section.getByText(/↑\s5\.200\s€/)).toBeVisible();
  });

  test('verdict block: facts, range and price that follows the chart', async ({ page }) => {
    await page.goto('/dev/ui');
    const panel = page.locator('#urteil [data-scrub-scope]');
    await expect(panel.getByText('Guter Preis')).toBeVisible();
    await expect(
      panel.getByText(/^Günstiger als an \d+ von 58 Tagen seit 15\. Aug\.$/),
    ).toBeVisible();
    await expect(panel.getByText('Stand: heute, 07:12 Uhr · Quelle: Google Hotels')).toBeVisible();
    await expect(
      panel.getByRole('img', {
        name: /^Aktuell .+, zwischen Tief .+ und Hoch .+ seit 15\. Aug\.$/,
      }),
    ).toBeVisible();

    const total = panel.getByText(/^gesamt · .+ pro Nacht · 2 Nächte, 2 Erwachsene$/);
    await expect(total).toBeVisible();
    await panel.getByRole('slider').focus();
    await page.keyboard.press('Home');
    await expect(panel.getByText('Preis am 15. Aug.')).toBeVisible();
    await expect(total).toBeHidden();
    await expect(panel).toHaveAttribute('data-scrubbing', '');
    // A day without a price never borrows today's price.
    for (let i = 0; i < 22; i++) await page.keyboard.press('ArrowRight');
    await expect(panel.getByText('6. Sept.: kein Preis')).toBeVisible();
    await expect(panel.getByText('–', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(total).toBeVisible();
    await expect(panel).not.toHaveAttribute('data-scrubbing');
  });

  test('collecting state and toast', async ({ page }) => {
    await page.goto('/dev/ui');
    const progress = page.getByRole('progressbar', { name: '3 von 7 Tagen gesammelt' });
    await expect(progress).toHaveAttribute('aria-valuenow', '3');
    await expect(
      page.getByText('Tag 3 von 7 · Einschätzung frühestens Sa, 17. Okt.'),
    ).toBeVisible();
    await expect(page.getByText('Für ein Urteil fehlen noch 4 Tage mit Preis.')).toBeVisible();

    await page.getByRole('button', { name: 'Toast zeigen' }).click();
    const toast = page.getByRole('status').filter({ hasText: 'Du beobachtest jetzt diesen Preis' });
    await expect(toast).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toast).toBeHidden();
    await page.getByRole('button', { name: 'Toast zeigen' }).click();
    await toast.getByRole('button', { name: 'Schließen' }).click();
    await expect(toast).toBeHidden();
  });
});
