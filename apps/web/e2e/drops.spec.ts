import { expect, test } from '@playwright/test';

/** `/dev/drops` builds its sample nights from today, so hrefs are matched by pattern. */
const STAY = (slug: string) =>
  new RegExp(`^/hotel/${slug}/\\d{4}-\\d{2}-\\d{2}--\\d{4}-\\d{2}-\\d{2}\\?adults=2$`);
const DROP = (slug: string) => new RegExp(`^/preissturz/${slug}/\\d{4}-\\d{2}-\\d{2}$`);

test.describe('Preissturz-Radar (C-080a, sample data on /dev/drops)', () => {
  test('the biggest drop is the hero: both prices, usual price, site, new low', async ({
    page,
  }) => {
    await page.goto('/dev/drops');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Price Drops heute');
    const main = page.getByRole('main');
    await expect(main).toContainText('10 Nächte günstiger in 5 Hotels');
    await expect(main).toContainText('5.722 Nächte in 82 Hotels auf 4 Buchungsseiten geprüft');

    const hero = main.getByRole('article', { name: 'Baur au Lac' });
    await expect(hero.getByRole('link', { name: 'Baur au Lac' })).toHaveAttribute(
      'href',
      DROP('baur-au-lac-zuerich'),
    );
    await expect(hero).toContainText('Preissturz des Tages');
    await expect(hero).toContainText('Preis um −31 % gefallen');
    await expect(hero).toContainText('684 €');
    await expect(hero).toContainText('Vortag 989 €');
    await expect(hero).toContainText('305 € weniger bei Booking.com');
    await expect(hero).toContainText('Sonst um 1.029 € · Niedrigster Preis seit 10 Tagen');

    // The hero leaves the grid.
    const cards = main.getByRole('list', { name: 'Preisstürze' }).getByRole('listitem');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toContainText('137 € weniger direkt beim Hotel');
    await expect(cards.nth(2)).toContainText('Niedrigster Preis, seit wir messen');
    await expect(cards.nth(2)).not.toContainText('Sonst um');
  });

  test('a card lists its other nights', async ({ page }) => {
    await page.goto('/dev/drops?stadt=zuerich');
    const cards = page
      .getByRole('main')
      .getByRole('list', { name: 'Preisstürze' })
      .getByRole('listitem');
    await expect(cards).toHaveCount(1);
    // Four more nights: three as links, then "+1 weitere".
    await expect(cards.first().getByRole('link')).toHaveCount(4);
    await expect(cards.first()).toContainText('+1 weitere');
  });

  test('a weekend drop: badge, both dates, two nights, its own page and stay', async ({ page }) => {
    await page.goto('/dev/drops');
    const card = page
      .getByRole('main')
      .getByRole('list', { name: 'Preisstürze' })
      .getByRole('listitem')
      .filter({ hasText: 'Fairmont Hotel Vier Jahreszeiten' });
    await expect(card).toContainText('Wochenende');
    await expect(card).toContainText(
      /Hamburg · Fr, \d+\. \p{L}+\.? – So, \d+\. \p{L}+\.? · 2 Nächte, 2 Erwachsene/u,
    );
    await expect(card).toContainText('980 €');
    await expect(card).toContainText('Vortag 1.240 €');
    const link = card.getByRole('link', { name: 'Fairmont Hotel Vier Jahreszeiten' });
    await expect(link).toHaveAttribute(
      'href',
      /^\/preissturz\/fairmont-hotel-vier-jahreszeiten-hamburg\/\d{4}-\d{2}-\d{2}--\d{4}-\d{2}-\d{2}$/,
    );

    await page.goto('/dev/drops?share=fairmont-hotel-vier-jahreszeiten-hamburg');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'So hat sich der Preis bewegt' })).toBeVisible();
    await expect(
      main.getByText('Gesamtpreis für beide Nächte, jeden Morgen gemessen.'),
    ).toBeVisible();
    await expect(main.getByRole('list').getByText('2 Nächte', { exact: true })).toBeVisible();
    const stay = await main
      .getByRole('link', { name: 'Alle Seiten und Preise für diese Daten' })
      .getAttribute('href');
    const m = /\/(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})\?adults=2$/.exec(stay ?? '');
    expect(m).not.toBeNull();
    const nights = (Date.parse(m?.[2] ?? '') - Date.parse(m?.[1] ?? '')) / 86_400_000;
    expect(nights).toBe(2);
  });

  test('a social bio link lands on the radar with a short welcome', async ({ page }) => {
    await page.goto('/tiktok');
    await expect(page).toHaveURL(/\/preissturz\?ref=tiktok$/);
    await page.goto('/dev/drops?ref=tiktok');
    await expect(page.getByText('Hi! Schön, dass du von TikTok kommst.')).toBeVisible();
    await expect(page.getByRole('article', { name: 'Baur au Lac' })).toBeInViewport();
    await page.goto('/dev/drops');
    await expect(page.getByText(/Schön, dass du von/)).toHaveCount(0);
  });

  test('filters and sorting are links that keep each other', async ({ page }) => {
    await page.goto('/dev/drops');
    const main = page.getByRole('main');
    const cities = main.getByRole('navigation', { name: 'Nach Stadt filtern' });
    await expect(cities.getByRole('link')).toHaveText([
      'Alle Städte',
      'Barcelona',
      'Berlin',
      'Hamburg',
      'London',
      'Zürich',
    ]);
    await expect(cities.getByRole('link', { name: 'Berlin' })).toHaveAttribute(
      'href',
      '/preissturz?stadt=berlin',
    );

    await page.goto('/dev/drops?wann=week&sort=eur');
    const when = main.getByRole('navigation', { name: 'Nach Reisezeit filtern' });
    await expect(when.getByRole('link', { name: 'Nächste 7 Tage' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const sort = main.getByRole('navigation', { name: 'Sortieren' });
    await expect(sort.getByRole('link', { name: 'Größter Sturz' })).toHaveAttribute(
      'href',
      '/preissturz?wann=week',
    );
    const cards = main.getByRole('list', { name: 'Preisstürze' }).getByRole('listitem');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Hotel Adlon Kempinski');

    await page.goto('/dev/drops?sort=soon');
    await expect(
      main.getByRole('list', { name: 'Preisstürze' }).getByRole('listitem').first(),
    ).toContainText('Hotel Adlon Kempinski');
  });

  test('empty states: none at all, and none for these filters', async ({ page }) => {
    await page.goto('/dev/drops?empty');
    await expect(page.getByRole('heading', { name: 'Gerade keine Preisstürze' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alle Hotels ansehen' })).toHaveAttribute(
      'href',
      '/hotels',
    );

    await page.goto('/dev/drops?stadt=london&wann=week');
    await expect(
      page.getByText('Mit diesen Filtern gibt es gerade keinen Preissturz.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Filter zurücksetzen' })).toHaveAttribute(
      'href',
      '/preissturz',
    );
  });

  test('the teaser shows the top three and links to the radar', async ({ page }) => {
    await page.goto('/dev/drops?teaser');
    const section = page.getByRole('region', { name: 'Preisstürze seit gestern' });
    await expect(section.getByRole('listitem')).toHaveCount(3);
    await expect(section.getByRole('link', { name: 'Alle Preisstürze' })).toHaveAttribute(
      'href',
      '/preissturz',
    );
  });

  test('English copy and paths', async ({ page }) => {
    await page.goto('/en/dev/drops');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: /city/i }).getByRole('link', { name: 'Zurich' }),
    ).toHaveAttribute('href', '/en/preissturz?stadt=zuerich');
  });

  test('without a database the real page says it is unavailable', async ({ page }) => {
    await page.goto('/preissturz');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
  });
});

test.describe('drop page (C-080b, sample data on /dev/drops?share)', () => {
  test("the drop, the way to the stay and the night's history", async ({ page }) => {
    await page.goto('/dev/drops?share');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Baur au Lac');
    const main = page.getByRole('main');
    const card = main.getByRole('region', { name: 'Preis um −31 % gefallen' });
    await expect(card.getByText('Price Drop seit gestern')).toBeVisible();
    await expect(card).toContainText('684 €');
    await expect(card).toContainText('statt 989 € gestern');
    await expect(card).toContainText(/Gesehen heute, \d\d:\d\d bei Booking\.com\./);
    await expect(
      main.getByRole('link', { name: 'Alle Seiten und Preise für diese Daten' }),
    ).toHaveAttribute('href', STAY('baur-au-lac-zuerich'));
    await expect(main.getByRole('link', { name: 'Zürich', exact: true })).toHaveAttribute(
      'href',
      '/preissturz?stadt=zuerich',
    );
    await expect(main.getByRole('heading', { name: 'So hat sich der Preis bewegt' })).toBeVisible();
    await expect(
      main.getByRole('img', { name: /^Preisverlauf: .+ kostete .+, heute 684 €\.$/ }),
    ).toBeVisible();
    const meter = main.getByRole('region', { name: 'Günstig oder teuer?' });
    await expect(meter.getByRole('img', { name: /^Günstig: aktuell 684 €/ })).toBeVisible();
    await expect(meter).toContainText('Heute zahlst du');
    const nights = main.getByRole('region', { name: 'Weitere Price Drops hier' });
    await expect(nights.getByRole('link')).toHaveCount(4);
    await expect(nights.getByRole('link').first()).toHaveAttribute(
      'href',
      DROP('baur-au-lac-zuerich'),
    );
    // Four of today's other drops as tiles.
    const others = main.getByRole('region', { name: 'Heute auch gefallen' });
    await expect(others.getByRole('listitem')).toHaveCount(4);
    // The alert is for this hotel only: no city to pick, consent never pre-ticked.
    const alert = main.getByRole('region', { name: 'Price Alert für dieses Hotel' });
    await expect(alert.getByRole('combobox')).toHaveCount(0);
    await expect(alert.getByRole('checkbox')).not.toBeChecked();
    await expect(alert.getByRole('button', { name: 'Price Alert aktivieren' })).toBeVisible();
  });

  test('straight to the site with the price: labelled partner link, new tab', async ({ page }) => {
    await page.goto('/dev/drops?share');
    const offer = page.getByRole('link', { name: 'Bei Booking.com ansehen · 684 € (neuer Tab)' });
    await expect(offer).toHaveAttribute(
      'href',
      /^\/go\/booking-com\/baur-au-lac-zuerich\?in=\d{4}-\d{2}-\d{2}&out=\d{4}-\d{2}-\d{2}&adults=2&lang=de$/,
    );
    await expect(offer).toHaveAttribute('target', '_blank');
    await expect(offer).toHaveAttribute('rel', 'sponsored nofollow noopener');
    await expect(page.getByText(/^Partnerlink\. Prüf den Preis vor dem Buchen/)).toBeVisible();
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

  test('"Als Story teilen" makes a 1080 × 1920 PNG (download where sharing files is unsupported)', async ({
    page,
  }) => {
    await page.goto('/dev/drops?share');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Als Story teilen' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^tidaq-baur-au-lac-zuerich-\d{4}-\d{2}-\d{2}\.png$/);
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const png = Buffer.concat(chunks);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1920]);
    await expect(page.getByRole('status')).toHaveText('Bild gespeichert');
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
      'Dieser Preissturz ist vorbei',
    );
    await expect(page.getByRole('link', { name: 'Aktuellen Preis ansehen' })).toHaveAttribute(
      'href',
      STAY('hotel-adlon-kempinski-berlin'),
    );
    await expect(page.getByRole('link', { name: 'Alle Preisstürze ansehen' })).toHaveAttribute(
      'href',
      '/preissturz',
    );
  });

  test('the real route: unavailable without a database, 404 for invalid links', async ({
    page,
  }) => {
    await page.goto('/preissturz/baur-au-lac-zuerich/2030-01-01');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
    for (const path of [
      '/preissturz/baur-au-lac-zuerich/2026-02-31',
      '/preissturz/Baur/2030-01-01',
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
      'Die größten Preisstürze der Woche',
    );
    const main = page.getByRole('main');
    await expect(main).toContainText('9 Preisstürze');
    await expect(main).toContainText('in 5 Hotels');
    await expect(main).toContainText('größter −31 %');
    await expect(main).toContainText('1 Wochenende');

    const top = main.getByRole('region', { name: 'Top 5' }).getByRole('listitem');
    await expect(top).toHaveCount(5);
    await expect(top.first()).toContainText('Baur au Lac');
    await expect(top.first()).toContainText(/gesehen \p{L}{2}, \d+\. \p{L}+\./u);
    // Each hotel links to its stay's price history; the weekend to its 2 nights.
    const weekend = top.filter({ hasText: 'Fairmont Hotel Vier Jahreszeiten' });
    const href = await weekend.getByRole('link').getAttribute('href');
    const m = /\/(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})\?adults=2$/.exec(href ?? '');
    expect((Date.parse(m?.[2] ?? '') - Date.parse(m?.[1] ?? '')) / 86_400_000).toBe(2);

    const cities = main.getByRole('region', { name: 'Wo es diese Woche am meisten fiel' });
    await expect(cities.getByRole('link').first()).toHaveAttribute(
      'href',
      '/preissturz?stadt=zuerich',
    );
    await expect(main.getByRole('link', { name: 'Preisstürze von heute ansehen' })).toHaveAttribute(
      'href',
      '/preissturz',
    );
  });

  test('the radar links to it; empty week and the real route without a database', async ({
    page,
  }) => {
    await page.goto('/dev/drops');
    await expect(
      page.getByRole('link', { name: /Wochenrückblick: die größten Preisstürze der Woche/ }),
    ).toHaveAttribute('href', '/preissturz/woche');
    await page.goto('/dev/drops?week&empty');
    await expect(page.getByText(/noch keinen Preissturz/)).toBeVisible();
    await page.goto('/preissturz/woche');
    await expect(page.getByRole('link', { name: 'Neu laden' })).toBeVisible();
  });
});
