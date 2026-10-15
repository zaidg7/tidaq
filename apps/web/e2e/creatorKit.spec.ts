import { expect, test, type Download } from '@playwright/test';

/** Width and height of a PNG download. */
async function pngSize(file: Download): Promise<[number, number]> {
  const chunks: Buffer[] = [];
  for await (const c of await file.createReadStream()) chunks.push(c as Buffer);
  const png = Buffer.concat(chunks);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

const plain = (s: string) => s.replace(/[  ]/g, ' ');

test.describe('creator kit (C-080c, sample data on /dev/admin/drops)', () => {
  test('the page is behind the admin login', async ({ page }) => {
    await page.goto('/admin/preisstuerze');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('every drop has a caption and a story image', async ({ page }) => {
    await page.goto('/dev/admin/drops');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Preisstürze für Social Media',
    );
    const items = page.getByRole('main').getByRole('listitem');
    await expect(items).toHaveCount(4);
    const first = items.first();
    await expect(first.getByRole('heading')).toHaveText('1. Baur au Lac');
    const caption = plain(await first.getByLabel('Text für Baur au Lac').inputValue());
    expect(caption).toContain('Preissturz im Baur au Lac, Zürich');
    expect(caption).toMatch(/: 684 € statt 989 € am Vortag \(−31 %\) bei Booking\.com\./);
    expect(caption).toContain('#zürich');
    await expect(first.getByRole('link', { name: 'Seite öffnen' })).toHaveAttribute(
      'href',
      /^\/preissturz\/baur-au-lac-zuerich\/\d{4}-\d{2}-\d{2}$/,
    );

    const download = page.waitForEvent('download');
    await first.getByRole('button', { name: 'Story-Bild' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^tidaq-baur-au-lac-zuerich-\d{4}-\d{2}-\d{2}\.png$/);
    expect(await pngSize(file)).toEqual([1080, 1920]);
    await expect(page.getByRole('status')).toHaveText('Bild gespeichert');
  });

  test('top set: cover plus one story per drop, and the list caption', async ({ page }) => {
    await page.goto('/dev/admin/drops');
    const caption = plain(await page.getByLabel('Text für die Top 5').inputValue());
    expect(caption.split('\n')[0]).toMatch(
      /^Die 4 größten Preisstürze in Luxushotels seit gestern/,
    );
    expect(caption).toContain('1. Baur au Lac, Zürich: 684 € statt 989 € (−31 %)');

    const files: Download[] = [];
    page.on('download', (d) => files.push(d));
    await page.getByRole('button', { name: '5 Bilder teilen' }).click();
    await expect(page.getByRole('status')).toHaveText('5 Bilder gespeichert');
    expect(files.map((f) => f.suggestedFilename())[0]).toMatch(
      /^tidaq-top5-\d{4}-\d{2}-\d{2}-0\.png$/,
    );
    expect(files).toHaveLength(5);
    expect(await pngSize(files[0] as Download)).toEqual([1080, 1920]);
  });

  test('"Text kopieren" puts the caption on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/dev/admin/drops');
    const first = page.getByRole('main').getByRole('listitem').first();
    await first.getByRole('button', { name: 'Text kopieren' }).click();
    await expect(page.getByRole('status')).toHaveText('Text kopiert');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(await first.getByLabel('Text für Baur au Lac').inputValue());
  });
});
