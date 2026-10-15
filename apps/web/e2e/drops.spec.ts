import { expect, test } from '@playwright/test';

/** `/dev/drops` builds its sample nights from today, so hrefs are matched by pattern. */
const STAY = (slug: string) =>
  new RegExp(`^/hotel/${slug}/\\d{4}-\\d{2}-\\d{2}--\\d{4}-\\d{2}-\\d{2}\\?adults=2$`);
const DROP = (slug: string) => new RegExp(`^/preissturz/${slug}/\\d{4}-\\d{2}-\\d{2}$`);

test.describe('Preissturz-Radar (C-080a, sample data on /dev/drops)', () => {
  test('biggest drop first, both prices, site and new-low line', async ({ page }) => {
    await page.goto('/dev/drops');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preisstürze in Luxushotels');
    const main = page.getByRole('main');
    await expect(main).toContainText('8 Nächte günstiger');
    await expect(main).toContainText('in 4 Hotels');
    await expect(main).toContainText('größter Sturz −31 %');

    const cards = main.getByRole('list', { name: 'Preisstürze' }).getByRole('listitem');
    await expect(cards).toHaveCount(4);
    const top = cards.first();
    await expect(top.getByRole('link', { name: 'Baur au Lac' })).toHaveAttribute(
      'href',
      DROP('baur-au-lac-zuerich'),
    );
    await expect(top).toContainText('Preis um −31 % gefallen');
    await expect(top).toContainText('684 €');
    await expect(top).toContainText('Vortag 989 €');
    await expect(top).toContainText('305 € weniger bei Booking.com');
    await expect(top).toContainText('Niedrigster Preis seit 10 Tagen');
    // Four more nights: three as links, then "+1 weitere".
    await expect(top.getByRole('link')).toHaveCount(4);
    await expect(top).toContainText('+1 weitere');

    await expect(cards.nth(1)).toContainText('137 € weniger direkt beim Hotel');
    await expect(cards.nth(2)).toContainText('Niedrigster Preis, seit wir messen');
  });

  test('filters and sorting are links that keep each other', async ({ page }) => {
    await page.goto('/dev/drops');
    const main = page.getByRole('main');
    const cities = main.getByRole('navigation', { name: 'Nach Stadt filtern' });
    await expect(cities.getByRole('link')).toHaveText([
      'Alle Städte',
      'Barcelona',
      'Berlin',
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
    await expect(main).toContainText('Preis um −31 % gefallen');
    await expect(main).toContainText('Vortag 989 €');
    await expect(main).toContainText('305 € weniger bei Booking.com');
    await expect(main).toContainText(/Gesehen heute, \d\d:\d\d bei Booking\.com/);
    await expect(
      main.getByRole('link', { name: 'Alle Anbieter und Preisverlauf' }),
    ).toHaveAttribute('href', STAY('baur-au-lac-zuerich'));
    await expect(main.getByRole('link', { name: 'Preissturz · Zürich' })).toHaveAttribute(
      'href',
      '/preissturz?stadt=zuerich',
    );
    await expect(main.getByRole('heading', { name: 'Preisverlauf dieser Nacht' })).toBeVisible();
    const nights = main.getByRole('region', { name: 'Auch günstiger im Baur au Lac' });
    await expect(nights.getByRole('link')).toHaveCount(4);
    await expect(nights.getByRole('link').first()).toHaveAttribute(
      'href',
      DROP('baur-au-lac-zuerich'),
    );
    const others = main.getByRole('region', { name: 'Weitere Preisstürze heute' });
    await expect(others.getByRole('listitem')).toHaveCount(3);
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
