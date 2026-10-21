import { expect, test } from '@playwright/test';

const STAY = '/hotel/hotel-adlon-kempinski-berlin/2026-12-04--2026-12-06';

test.describe('stay page states (C-022a, sample data on /dev/stay)', () => {
  test('tracked: verdict, chart, low/avg/high, advice and other dates', async ({ page }) => {
    await page.goto('/dev/stay/tracked');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hotel Adlon Kempinski');
    // The stay as one line of text under the name (C-137).
    await expect(page.getByText('4.–6. Dez. 2026', { exact: true })).toBeVisible();
    await expect(
      page.locator('main header p', { hasText: '2 Nächte · 2 Erwachsene' }).last(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Preise jeder Nacht in diesem Hotel' }),
    ).toHaveAttribute('href', '/hotel/hotel-adlon-kempinski-berlin');
    await expect(page.getByText('Guter Preis').first()).toBeVisible();

    await expect(page.getByRole('term')).toHaveText(['Tief', 'Ø 30 Tage', 'Hoch']);
    await expect(page.getByRole('definition').first()).toContainText('am 24. Sept.');

    await expect(page.getByRole('heading', { name: 'Unsere Einschätzung' })).toBeVisible();
    await expect(page.getByText('Guter Preis im Vergleich zu den letzten 58 Tagen.')).toBeVisible();
    await expect(page.getByText('Als Tabelle anzeigen').locator('visible=true')).toHaveCount(1);

    // No other dates of the hotel (C-173): people come with their own dates.
    await expect(page.getByText('Weitere Termine in diesem Hotel')).toHaveCount(0);
  });

  test('price history: 30 days first, 14 T / Alles switch, usual range legend (C-111)', async ({
    page,
  }) => {
    await page.goto('/dev/stay/tracked');
    const ranges = page.getByRole('radiogroup', { name: 'Zeitraum' });
    await expect(ranges.getByRole('radio', { name: '30 T' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByText(/^Üblich: /).locator('visible=true')).toHaveCount(1);
    const visibleChart = page.locator('figure:visible');
    await expect(visibleChart).toHaveCount(1);
    const thirty = await visibleChart.locator('svg[role="img"]').getAttribute('aria-label');
    await ranges.getByRole('radio', { name: '14 T' }).click();
    await expect(ranges.getByRole('radio', { name: '14 T' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.locator('figure:visible')).toHaveCount(1);
    expect(
      await page.locator('figure:visible svg[role="img"]').getAttribute('aria-label'),
    ).not.toBe(thirty);
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

    // Price alert (C-030b): email, optional target, consent never pre-ticked.
    const watch = page.getByRole('region', { name: 'Preis beobachten' });
    await expect(watch.getByLabel('Deine E-Mail-Adresse')).toHaveAttribute('type', 'email');
    await expect(watch.getByLabel('Wunschpreis (optional)')).toBeVisible();
    await expect(watch.getByRole('checkbox')).not.toBeChecked();
    await expect(watch.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      '/datenschutz',
    );
  });

  test('"Zum Angebot" opens the provider in a new tab through /go (C-026)', async ({ page }) => {
    await page.goto('/dev/stay/tracked');
    const table = page.getByRole('region', { name: 'Preise heute' });
    const booking = table.getByRole('link', { name: 'Zum Angebot bei Booking.com (neuer Tab)' });
    await expect(booking).toHaveAttribute(
      'href',
      '/go/booking-com/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06&adults=2&lang=de',
    );
    await expect(booking).toHaveAttribute('target', '_blank');
    await expect(booking).toHaveAttribute('rel', 'sponsored nofollow noopener');
    await expect(booking).toContainText('Zum Angebot');
    await expect(table.getByRole('link', { name: /^Zum Angebot bei/ })).toHaveCount(5);
    await expect(
      table.getByRole('link', { name: 'Zum Angebot bei Website des Hotels (neuer Tab)' }),
    ).toHaveAttribute('href', /^\/go\/hotel-direct\//);
  });

  test('on phones the whole provider row is the link', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dev/stay/tracked');
    const row = page.getByRole('region', { name: 'Preise heute' }).getByRole('listitem').nth(1);
    // The outbound link (the trust score links to the provider page, C-034b).
    const link = row.locator('a[target="_blank"]');
    const [r, l] = await Promise.all([row.boundingBox(), link.boundingBox()]);
    // Inside the row's 1 px divider border.
    expect(Math.abs((l?.width ?? 0) - (r?.width ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((l?.height ?? 0) - (r?.height ?? 0))).toBeLessThanOrEqual(2);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });

  test('price alert: the form explains every outcome (C-030b)', async ({ page }) => {
    await page.goto('/dev/stay/tracked');
    const watch = page.getByRole('region', { name: 'Preis beobachten' });
    await watch.getByLabel('Deine E-Mail-Adresse').fill('gast@example.com');
    await watch.getByLabel('Wunschpreis (optional)').fill('viel');
    await watch.getByRole('checkbox').check();
    await watch.getByRole('button', { name: 'Preis beobachten' }).click();
    await expect(watch.getByText('Gib den Wunschpreis als Zahl ein, z. B. 1.100.')).toBeVisible();
    // A valid request without a database (CI) fails gracefully and keeps the form.
    await watch.getByLabel('Wunschpreis (optional)').fill('1.100');
    await watch.getByRole('button', { name: 'Preis beobachten' }).click();
    await expect(watch.getByRole('alert')).toHaveText(
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
    );
    await expect(watch.getByLabel('Deine E-Mail-Adresse')).toBeVisible();
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

  test('history from single nights says so, and shows a real price that differs (C-070b)', async ({
    page,
  }) => {
    await page.goto('/dev/stay/nights');
    await expect(
      page.getByText(
        /^Der Verlauf ist die Summe der Preise der einzelnen Nächte beim selben Anbieter\./,
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Für genau diese Daten zeigen die Anbieter heute 1\.544\s€, die Summe der Nächte liegt bei 2\.244\s€\./,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'So rechnen wir' }),
    ).toHaveAttribute('href', '/methodik');
    // Real checks of the exact stay need no note.
    await page.goto('/dev/stay/tracked');
    await expect(page.getByText(/einzelnen Nächte/)).toHaveCount(0);
  });

  test('hotels where single nights mislead show real checks only (C-070d)', async ({ page }) => {
    await page.goto('/dev/stay/real-only');
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: 'Für dieses Hotel prüfen wir ganze Aufenthalte',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/einzelne Nächte oft anders als der ganze Aufenthalt/),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Preise heute' })).toHaveCount(0);
    // C-132a: the request went through, so the page says when prices come and offers a reload.
    await expect(
      page.getByText(/Die ersten Preise kommen meist nach ein paar Minuten/),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Neu laden' })).toHaveAttribute(
      'href',
      /^\/hotel\/.+\/2026-12-04--2026-12-06\?adults=2$/,
    );

    await page.goto('/dev/stay/real-only-history');
    await expect(
      page.getByText(
        /^Der Verlauf zeigt nur Preise, die wir für genau diese Daten abgefragt haben\./,
      ),
    ).toBeVisible();
    await expect(page.getByText(/Summe der Preise der einzelnen Nächte/)).toHaveCount(0);

    await page.goto('/en/dev/stay/real-only');
    await expect(
      page.getByRole('heading', { level: 2, name: 'For this hotel we check whole stays' }),
    ).toBeVisible();
  });

  test('dates beyond the night grid say how far ahead we collect', async ({ page }) => {
    await page.goto('/dev/stay/untracked');
    await expect(page.getByText(/die Preise jeder Nacht für die nächsten 270 Tage/)).toBeVisible();
    // No room for new dates today: said plainly, no promise of prices (C-132a).
    await expect(page.getByText(/Heute nehmen wir keine neuen Daten mehr an/)).toBeVisible();
    await expect(page.getByText(/ersten Preise kommen/)).toHaveCount(0);
    await page.goto('/en/dev/stay/untracked-guests');
    await expect(
      page.getByRole('heading', { level: 2, name: 'No history for 3 people yet' }),
    ).toBeVisible();
  });

  test('no data, untracked, past and inactive each explain themselves', async ({ page }) => {
    const cases: [string, string][] = [
      ['no-data', 'Für diesen Aufenthalt gibt es noch keine Preise'],
      ['untracked', 'So weit im Voraus haben wir noch keine Preise'],
      ['untracked-guests', 'Für 3 Personen gibt es noch keinen Verlauf'],
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
    await expect(page.getByText('4–6 Dec 2026', { exact: true })).toBeVisible();
    await expect(
      page.locator('main header p', { hasText: '2 nights · 2 adults' }).last(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Our take' })).toBeVisible();
  });
});

test.describe('outbound route (C-026)', () => {
  test('without a database it says so instead of a dead redirect', async ({ request }) => {
    const res = await request.get(
      '/go/booking-com/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06&adults=2',
      { maxRedirects: 0 },
    );
    expect(res.status()).toBe(503);
    expect(res.headers()['cache-control']).toBe('no-store');
    expect(await res.text()).toContain('Buchungsseite');
  });

  test('malformed links are a 404', async ({ request }) => {
    for (const path of [
      '/go/Booking/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06',
      '/go/booking-com/hotel-adlon-kempinski-berlin?in=4.12.2026&out=2026-12-06',
      '/go/booking-com/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06&adults=two',
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
    }
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
