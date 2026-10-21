import { expect, test } from '@playwright/test';

/** `/dev/drops` builds its sample trips from today, so hrefs are matched by pattern. */
const STAY = (slug: string) =>
  new RegExp(`^/hotel/${slug}/\\d{4}-\\d{2}-\\d{2}--\\d{4}-\\d{2}-\\d{2}\\?adults=2$`);
const DROP = (slug: string) =>
  new RegExp(`^/price-drops/${slug}/\\d{4}-\\d{2}-\\d{2}--\\d{4}-\\d{2}-\\d{2}$`);
/** Nights between check-in and check-out in a `…/YYYY-MM-DD--YYYY-MM-DD…` link. */
const nightsIn = (href: string | null) => {
  const m = /(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})/.exec(href ?? '');
  return (Date.parse(m?.[2] ?? '') - Date.parse(m?.[1] ?? '')) / 86_400_000;
};

test.describe('Price Drop-Radar (C-080a, sample data on /dev/drops)', () => {
  test('the biggest drop is the hero: both prices, usual price, site, new low', async ({
    page,
  }) => {
    await page.goto('/dev/drops');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Price Drops heute');
    const main = page.getByRole('main');
    await expect(main).toContainText('9 Aufenthalte günstiger in 5 Hotels');
    await expect(main).toContainText('5.722 Nächte in 82 Hotels auf 4 Buchungsseiten geprüft');

    const hero = main.getByRole('article', { name: 'Baur au Lac' });
    await expect(hero.getByRole('link', { name: 'Baur au Lac' })).toHaveAttribute(
      'href',
      DROP('baur-au-lac-zuerich'),
    );
    await expect(hero).toContainText('Price Drop des Tages');
    await expect(hero).toContainText('Preis gefallen: −31 %');
    await expect(hero).toContainText('5 Nächte, 2 Erwachsene');
    // Exact quote only (D-52): per night as the site shows it, the stay total, taxes included.
    await expect(hero).toContainText('684 € pro Nacht');
    await expect(hero).toContainText('3.420 € für 5 Nächte · inkl. Steuern und Gebühren');
    await expect(hero).toContainText('−31 % seit gestern bei Booking.com');
    await expect(hero).toContainText('Niedrigster Preis seit 10 Tagen');
    await expect(hero).not.toContainText('Vortag');
    await expect(hero).not.toContainText('Sonst um');

    // The hero leaves the grid.
    const cards = main.getByRole('list', { name: 'Price Drops' }).getByRole('listitem');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toContainText(/% seit gestern direkt beim Hotel/);
    await expect(cards.first()).not.toContainText('weniger');
    await expect(cards.nth(2)).toContainText('Niedrigster Preis, seit wir messen');
    await expect(cards.nth(2)).not.toContainText('Sonst um');
  });

  test('a card lists its other trips', async ({ page }) => {
    await page.goto('/dev/drops?stadt=zuerich');
    const cards = page
      .getByRole('main')
      .getByRole('list', { name: 'Price Drops' })
      .getByRole('listitem');
    await expect(cards).toHaveCount(1);
    // Four more trips: three as links, then "+1 weitere".
    await expect(cards.first().getByRole('link')).toHaveCount(4);
    await expect(cards.first()).toContainText('+1 weitere');
  });

  test('a 7-night trip: badge, both dates, its own page and stay (C-125)', async ({ page }) => {
    await page.goto('/dev/drops');
    const card = page
      .getByRole('main')
      .getByRole('list', { name: 'Price Drops' })
      .getByRole('listitem')
      .filter({ hasText: 'Fairmont Hotel Vier Jahreszeiten' });
    await expect(card.getByText('7 Nächte', { exact: true })).toBeVisible();
    await expect(card).toContainText(
      /Hamburg · \p{L}{2}, \d+\. \p{L}+\.? – \p{L}{2}, \d+\. \p{L}+\.?\d/u,
    );
    await expect(card).toContainText('700 € pro Nacht');
    await expect(card).toContainText('4.900 € für 7 Nächte');
    const link = card.getByRole('link', { name: 'Fairmont Hotel Vier Jahreszeiten' });
    await expect(link).toHaveAttribute(
      'href',
      /^\/price-drops\/fairmont-hotel-vier-jahreszeiten-hamburg\/\d{4}-\d{2}-\d{2}--\d{4}-\d{2}-\d{2}$/,
    );

    await page.goto('/dev/drops?share=fairmont-hotel-vier-jahreszeiten-hamburg');
    const main = page.getByRole('main');
    await expect(main).toContainText('700 € pro Nacht');
    await expect(main).toContainText('4.900 € für 7 Nächte');
    await expect(main.locator('header').getByText('7 Nächte', { exact: true })).toBeVisible();
    const stay = await main
      .getByRole('link', { name: /^Alle Seiten (vergleichen|und Preise für diese Daten)$/ })
      .getAttribute('href');
    expect(stay).toMatch(STAY('fairmont-hotel-vier-jahreszeiten-hamburg'));
    expect(nightsIn(stay)).toBe(7);
  });

  test('old /preissturz links still land on /price-drops (C-125)', async ({ page }) => {
    await page.goto('/preissturz?stadt=dubai');
    await expect(page).toHaveURL(/\/price-drops\?stadt=dubai$/);
    await page.goto('/preissturz/woche');
    await expect(page).toHaveURL(/\/price-drops\/woche$/);
    await page.goto('/en/preissturz/baur-au-lac-zuerich/2030-01-01--2030-01-06');
    await expect(page).toHaveURL(/\/en\/price-drops\/baur-au-lac-zuerich\/2030-01-01--2030-01-06$/);
  });

  test('a social bio link lands on the radar with a short welcome', async ({ page }) => {
    await page.goto('/tiktok');
    await expect(page).toHaveURL(/\/price-drops\?ref=tiktok$/);
    await page.goto('/dev/drops?ref=tiktok');
    await expect(page.getByText('Hi! Schön, dass du von TikTok kommst.')).toBeVisible();
    await expect(page.getByRole('article', { name: 'Baur au Lac' })).toBeInViewport();
    await page.goto('/dev/drops');
    await expect(page.getByText(/Schön, dass du von/)).toHaveCount(0);
  });

  test('one Filter button: city, month, length and sort in a sheet with a live count (C-125)', async ({
    page,
  }) => {
    await page.goto('/dev/drops');
    const main = page.getByRole('main');
    // No walls of pills: the page shows one button and the number of hotels.
    await expect(main.getByRole('navigation')).toHaveCount(0);
    await expect(main.getByText('5 Hotels', { exact: true })).toBeVisible();
    await main.getByRole('button', { name: 'Filter' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filter' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel('Stadt').locator('option')).toHaveText([
      'Alle Städte',
      'Barcelona',
      'Berlin',
      'Hamburg',
      'London',
      'Zürich',
    ]);
    await expect(sheet.getByRole('button', { name: '5 Hotels anzeigen' })).toBeEnabled();
    await sheet.getByLabel('Stadt').selectOption('berlin');
    await expect(sheet.getByRole('button', { name: '1 Hotel anzeigen' })).toBeEnabled();
    // Berlin has no 7-night trip: the sheet says so before you leave the page.
    const length = sheet.getByRole('radiogroup', { name: 'Dauer' });
    await length.getByRole('radio', { name: '7 Nächte' }).click();
    await expect(sheet.getByRole('button', { name: 'Keine Treffer' })).toBeDisabled();
    await length.getByRole('radio', { name: 'Alle' }).click();
    await sheet.getByRole('button', { name: '1 Hotel anzeigen' }).click();
    await expect(page).toHaveURL(/\/price-drops\?stadt=berlin$/);
  });

  test('chosen filters are named in one line with one reset; links stay shareable', async ({
    page,
  }) => {
    await page.goto('/dev/drops?dauer=7&sort=eur');
    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: /^Filter\s*2$/ })).toBeVisible();
    // C-137: no removable pills, one line of text and "Zurücksetzen".
    await expect(main.getByText('7 Nächte · Ersparnis', { exact: true })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Zurücksetzen' })).toHaveAttribute(
      'href',
      '/price-drops',
    );
    // Only the 7-night trips, most money saved first.
    const cards = main.getByRole('list', { name: 'Price Drops' }).getByRole('listitem');
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText("Claridge's");
    for (const c of await cards.all()) {
      await expect(c.getByText('7 Nächte', { exact: true }).first()).toBeVisible();
    }

    // Travel month: chosen in the sheet, every card then starts in that month.
    await page.goto('/dev/drops');
    await main.getByRole('button', { name: 'Filter' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filter' });
    const months = sheet.getByRole('combobox', { name: 'Reisemonat' });
    await expect(months.locator('option').first()).toHaveText('Jeder Monat');
    const second = await months.locator('option').nth(1).getAttribute('value');
    await months.selectOption(second ?? '');
    await sheet.getByRole('button', { name: /anzeigen$/ }).click();
    await expect(page).toHaveURL(/\/price-drops\?monat=\d{4}-\d{2}$/);
    const month = new URL(page.url()).searchParams.get('monat') ?? '';
    await page.goto(`/dev/drops?monat=${month}`);
    for (const link of await main
      .getByRole('list', { name: 'Price Drops' })
      .getByRole('link', { name: /./ })
      .all()) {
      const to = await link.getAttribute('href');
      if (to?.startsWith('/price-drops/')) expect(to.split('/')[3]?.slice(0, 7)).toBe(month);
    }

    await page.goto('/dev/drops?sort=soon');
    await expect(
      main.getByRole('list', { name: 'Price Drops' }).getByRole('listitem').first(),
    ).toContainText('Hotel Adlon Kempinski');
  });

  test('empty states: none at all, and none for these filters', async ({ page }) => {
    await page.goto('/dev/drops?empty');
    await expect(page.getByRole('heading', { name: 'Gerade keine Price Drops' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alle Hotels ansehen' })).toHaveAttribute(
      'href',
      '/hotels',
    );

    await page.goto('/dev/drops?stadt=london&dauer=5');
    await expect(
      page.getByText('Mit diesen Filtern gibt es gerade keinen Price Drop.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Filter zurücksetzen' })).toHaveAttribute(
      'href',
      '/price-drops',
    );
  });

  test('the teaser shows the top three and links to the radar', async ({ page }) => {
    await page.goto('/dev/drops?teaser');
    const section = page.getByRole('region', { name: 'Price Drops seit gestern' });
    await expect(section.getByRole('listitem')).toHaveCount(3);
    await expect(section.getByRole('link', { name: 'Alle Price Drops' })).toHaveAttribute(
      'href',
      '/price-drops',
    );
  });

  test('English copy and paths', async ({ page }) => {
    await page.goto('/en/dev/drops');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Filter' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filter' });
    await sheet.getByLabel('City').selectOption('zuerich');
    await sheet.getByRole('button', { name: 'Show 1 hotel' }).click();
    await expect(page).toHaveURL(/\/en\/price-drops\?stadt=zuerich$/);
  });

  test('without a database the real page says it is unavailable', async ({ page }) => {
    await page.goto('/price-drops');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
  });
});

test.describe('drop page (C-080b, sample data on /dev/drops?share)', () => {
  test('the deal card, the way to the site and the price history (C-175)', async ({ page }) => {
    await page.goto('/dev/drops?share');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Baur au Lac');
    const main = page.getByRole('main');
    const card = main.getByRole('region', { name: 'Preis gefallen: −31 %' });
    await expect(card.getByText('Price Drop seit gestern')).toBeVisible();
    await expect(card).toContainText('684 € pro Nacht');
    await expect(card).toContainText('3.420 € für 5 Nächte · inkl. Steuern und Gebühren');
    await expect(card).not.toContainText('statt');
    await expect(card).toContainText(/Geprüft heute, \d\d:\d\d bei Booking\.com\./);
    // Everything about the deal sits in the card (C-175): compare all sites, share.
    await expect(card.getByRole('link', { name: 'Alle Seiten vergleichen' })).toHaveAttribute(
      'href',
      STAY('baur-au-lac-zuerich'),
    );
    await expect(card.getByRole('button', { name: 'Link teilen' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Zürich', exact: true })).toHaveAttribute(
      'href',
      '/price-drops?stadt=zuerich',
    );
    // The proof (C-175): this trip's price on the drop's site, ending at the card's price.
    const history = main.getByRole('region', { name: 'Preisverlauf bei Booking.com' });
    await expect(history.getByRole('img', { name: /^Preisverlauf über \d+ Tage/ })).toBeVisible();
    await expect(history.getByRole('img', { name: /zuletzt 3\.420\s€/ })).toBeVisible();
    // No other dates and no alert: the price just dropped.
    await expect(main.getByRole('region', { name: 'Weitere Price Drops hier' })).toHaveCount(0);
    await expect(main.getByRole('region', { name: 'Price Alert für dieses Hotel' })).toHaveCount(0);
    // Four of today's other drops as tiles.
    const others = main.getByRole('region', { name: 'Heute auch gefallen' });
    await expect(others.getByRole('listitem')).toHaveCount(4);
  });

  test('straight to the site with the price: labelled partner link, new tab', async ({ page }) => {
    await page.goto('/dev/drops?share');
    const offer = page.getByRole('link', {
      name: 'Bei Booking.com ansehen · 684 € pro Nacht (neuer Tab)',
    });
    await expect(offer).toHaveAttribute(
      'href',
      /^\/go\/booking-com\/baur-au-lac-zuerich\?in=\d{4}-\d{2}-\d{2}&out=\d{4}-\d{2}-\d{2}&adults=2&lang=de$/,
    );
    await expect(offer).toHaveAttribute('target', '_blank');
    await expect(offer).toHaveAttribute('rel', 'sponsored nofollow noopener');
    await expect(page.getByText(/^Partnerlink\. Günstigster Tarif der Seite/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mehr dazu' })).toHaveAttribute(
      'href',
      '/affiliate-hinweis',
    );
    // The hotel's own site needs its address: no button, the stay page is the way on.
    await page.goto('/dev/drops?share=hotel-adlon-kempinski-berlin');
    await expect(page.getByRole('link', { name: /neuer Tab/ })).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Alle Seiten und Preise für diese Daten' }),
    ).toBeVisible();
  });

  test('the public drop page has no story button (admin creator kit only, C-130)', async ({
    page,
  }) => {
    await page.goto('/dev/drops?share');
    await expect(page.getByRole('button', { name: 'Link teilen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Als Story teilen' })).toHaveCount(0);
  });

  test('"Link teilen" copies the drop page link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/dev/drops?share');
    await page.getByRole('button', { name: 'Link teilen' }).click();
    await expect(page.getByRole('status')).toHaveText('Link kopiert');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).pathname).toMatch(DROP('baur-au-lac-zuerich'));
  });

  test('a drop that is gone says so and points to the current price', async ({ page }) => {
    await page.goto('/dev/drops?over');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Dieser Price Drop ist vorbei',
    );
    await expect(page.getByRole('link', { name: 'Aktuellen Preis ansehen' })).toHaveAttribute(
      'href',
      STAY('hotel-adlon-kempinski-berlin'),
    );
    await expect(page.getByRole('link', { name: 'Alle Price Drops ansehen' })).toHaveAttribute(
      'href',
      '/price-drops',
    );
  });

  test('the real route: unavailable without a database, 404 for invalid links', async ({
    page,
  }) => {
    await page.goto('/price-drops/baur-au-lac-zuerich/2030-01-01');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
    for (const path of [
      '/price-drops/baur-au-lac-zuerich/2026-02-31',
      '/price-drops/Baur/2030-01-01',
      '/price-drops/baur-au-lac-zuerich/2030-01-01--2030-01-31',
    ]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
    }
  });
});

test.describe('weekly recap (C-080h, sample data on /dev/drops?week)', () => {
  test('headline numbers, ranked hotels with the day seen, cities', async ({ page }) => {
    await page.goto('/dev/drops?week');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Die größten Price Drops der Woche',
    );
    const main = page.getByRole('main');
    await expect(main).toContainText('9 Price Drops');
    await expect(main).toContainText('in 5 Hotels');
    await expect(main).toContainText('größter −31 %');

    const top = main.getByRole('region', { name: 'Top 5' }).getByRole('listitem');
    await expect(top).toHaveCount(5);
    await expect(top.first()).toContainText('Baur au Lac');
    await expect(top.first()).toContainText(/gesehen \p{L}{2}, \d+\. \p{L}+\./u);
    // Each hotel links to its trip's price history: the Fairmont to its 7 nights.
    const trip = top.filter({ hasText: 'Fairmont Hotel Vier Jahreszeiten' });
    expect(nightsIn(await trip.getByRole('link').getAttribute('href'))).toBe(7);

    const cities = main.getByRole('region', { name: 'Wo es diese Woche am meisten fiel' });
    await expect(cities.getByRole('link').first()).toHaveAttribute(
      'href',
      '/price-drops?stadt=zuerich',
    );
    await expect(main.getByRole('link', { name: 'Price Drops von heute ansehen' })).toHaveAttribute(
      'href',
      '/price-drops',
    );
  });

  test('the radar links to it; empty week and the real route without a database', async ({
    page,
  }) => {
    await page.goto('/dev/drops');
    await expect(
      page.getByRole('link', { name: /Wochenrückblick: die größten Price Drops der Woche/ }),
    ).toHaveAttribute('href', '/price-drops/woche');
    await page.goto('/dev/drops?week&empty');
    await expect(page.getByText(/noch keinen Price Drop/)).toBeVisible();
    await page.goto('/price-drops/woche');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
  });
});
