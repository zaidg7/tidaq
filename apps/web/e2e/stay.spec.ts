import { expect, test } from '@playwright/test';

const STAY = '/hotel/hotel-adlon-kempinski-berlin/2026-12-04--2026-12-06';

test.describe('stay page states (C-022a, sample data on /dev/stay)', () => {
  test('tracked: verdict, chart, low/avg/high, advice and other dates', async ({ page }) => {
    await page.goto('/dev/stay/tracked');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hotel Adlon Kempinski');
    await expect(page.getByText('4.–6. Dez. 2026 · 2 Nächte · 2 Erwachsene')).toBeVisible();
    await expect(page.getByText('Guter Preis').first()).toBeVisible();

    await expect(page.getByRole('term')).toHaveText(['Tief', 'Ø 30 Tage', 'Hoch']);
    await expect(page.getByRole('definition').first()).toContainText('am 24. Sept.');

    await expect(page.getByRole('heading', { name: 'Unsere Einschätzung' })).toBeVisible();
    await expect(page.getByText('Guter Preis im Vergleich zu den letzten 58 Tagen.')).toBeVisible();
    await expect(page.getByText('Als Tabelle anzeigen')).toBeVisible();

    const others = page.getByRole('region', { name: 'Weitere Termine in diesem Hotel' });
    await expect(others.getByRole('link')).toHaveCount(4);
    await expect(others.getByRole('link', { name: '16.–18. Okt. 2026' })).toHaveAttribute(
      'href',
      '/hotel/hotel-adlon-kempinski-berlin/2026-10-16--2026-10-18?adults=2',
    );
  });

  test('provider table: sorted by expected checkout price, with Preistreue (C-022b)', async ({
    page,
  }) => {
    await page.goto('/dev/stay/tracked');
    const table = page.getByRole('region', { name: 'Preise heute' });
    const rows = table.getByRole('listitem');
    // Expedia lists less than Booking.com but its tests show +8.9 % at checkout: it goes last.
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toContainText('Website des Hotels');
    await expect(rows.nth(0)).toContainText('Günstigster');
    await expect(rows.nth(0)).toContainText('6 von 6 Tests stimmten');
    await expect(rows.nth(1)).toContainText('Booking.com');
    await expect(rows.nth(4)).toContainText('Expedia');
    await expect(rows.nth(4)).toContainText(/an der Kasse ≈ 1\.252\s€/);
    await expect(table.getByText('Günstigster')).toHaveCount(1);
    await expect(rows.nth(2)).toContainText('Noch nicht getestet');
    await expect(rows.nth(3)).toContainText('Noch zu wenig Tests (3)');
    await expect(table.getByRole('link', { name: 'So sortieren wir' })).toHaveAttribute(
      'href',
      '/ranking',
    );
    await expect(table.getByText(/Die Reihenfolge hängt nie von Provisionen ab\./)).toBeVisible();
    await expect(table.getByText(/2 weitere Anbieter hatten einen Preis/)).toBeVisible();

    // The alert sign-up comes with C-030: until then the button says so and does nothing.
    await expect(page.getByRole('heading', { name: 'Preis beobachten' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bald verfügbar' })).toBeDisabled();
  });

  test('provider prices from an earlier day say which day', async ({ page }) => {
    await page.goto('/dev/stay/soon');
    await expect(page.getByRole('heading', { name: 'Preise vom 12. Okt.' })).toBeVisible();
    await page.goto('/en/dev/stay/soon');
    await expect(page.getByRole('heading', { name: 'Prices from 12 Oct' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'How we sort' })).toHaveAttribute(
      'href',
      '/en/ranking',
    );
  });

  test('check-in within 7 days adds the "don\'t wait" note', async ({ page }) => {
    await page.goto('/dev/stay/soon');
    await expect(page.getByText(/Kurz vor Anreise steigen Preise oft\./)).toBeVisible();
  });

  test('collecting: price so far and the 7-day progress, no stats yet', async ({ page }) => {
    await page.goto('/dev/stay/collecting');
    await expect(page.getByText('Für ein Urteil fehlen noch 4 Tage mit Preis.')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    await expect(page.getByRole('term')).toHaveCount(0);
  });

  test('no data, untracked, past and inactive each explain themselves', async ({ page }) => {
    const cases: [string, string][] = [
      ['no-data', 'Für diesen Aufenthalt gibt es noch keine Preise'],
      ['untracked', 'Diese Daten beobachten wir noch nicht'],
      ['past', 'Dieser Aufenthalt ist schon vorbei'],
      ['inactive', 'Dieses Hotel beobachten wir gerade nicht'],
    ];
    for (const [variant, title] of cases) {
      await page.goto(`/dev/stay/${variant}`);
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Preise heute' })).toHaveCount(0);
    }
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Zur Startseite' }),
    ).toHaveAttribute('href', '/');
  });

  test('"Ändern" opens the search card prefilled with this stay', async ({ page }) => {
    await page.goto('/dev/stay/tracked');
    await page.getByRole('button', { name: 'Ändern' }).click();
    // The same button now closes the card.
    await expect(page.getByRole('button', { name: 'Schließen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const form = page.getByRole('form', { name: 'Preise suchen' });
    await expect(form.getByRole('combobox', { name: 'Hotel' })).toHaveValue(
      'Hotel Adlon Kempinski',
    );
    await expect(form.getByRole('button', { name: /^Anreise/ })).toHaveAccessibleName(
      'Anreise Fr., 4. Dez.',
    );
    await form.getByLabel('Gäste').selectOption('3');
    await form.getByRole('button', { name: 'Preise ansehen' }).click();
    await expect(page).toHaveURL(new RegExp(`${STAY}\\?adults=3$`));
  });

  test('fits an iPhone screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dev/stay/tracked');
    // Icon-only edit button beside the name, still named for screen readers.
    await expect(page.getByRole('button', { name: 'Ändern' })).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });

  test('English copy', async ({ page }) => {
    await page.goto('/en/dev/stay/tracked');
    await expect(page.getByText('4–6 Dec 2026 · 2 nights · 2 adults')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Our take' })).toBeVisible();
  });
});

test.describe('stay route (C-022a)', () => {
  test('without a database it says prices are unavailable and offers a reload', async ({
    page,
  }) => {
    await page.goto(`${STAY}?adults=2`);
    await expect(
      page.getByRole('heading', { name: 'Preise gerade nicht erreichbar' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Neu laden' })).toHaveAttribute(
      'href',
      `${STAY}?adults=2`,
    );
    await page.goto(`/en${STAY}?adults=2`);
    await expect(page.getByRole('heading', { name: 'Prices unavailable right now' })).toBeVisible();
  });

  test('invalid guests redirect to the canonical URL', async ({ page }) => {
    await page.goto(`${STAY}?adults=9`);
    await expect(page).toHaveURL(new RegExp(`${STAY}\\?adults=2$`));
  });

  test('invalid dates are a 404', async ({ page }) => {
    for (const range of [
      '2026-12-06--2026-12-04',
      '2026-12-01--2027-01-15',
      '2026-02-30--2026-03-02',
      'morgen',
    ]) {
      const res = await page.goto(`/hotel/hotel-adlon-kempinski-berlin/${range}`);
      expect(res?.status(), range).toBe(404);
    }
    const res = await page.goto('/hotel/Not_A_Slug/2026-12-04--2026-12-06');
    expect(res?.status()).toBe(404);
  });
});
