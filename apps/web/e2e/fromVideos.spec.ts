import { expect, test } from '@playwright/test';

const plain = (s: string | null) => (s ?? '').replace(/[\u00a0\u202f]/g, ' ');

test.describe('"Aus unseren Videos" on the bio-link landing (C-080j)', () => {
  test("lists the posted drops first, live with today's prices or over", async ({ page }) => {
    await page.goto('/dev/drops?ref=tiktok');
    const section = page.getByRole('region', { name: 'Aus unseren Videos' });
    await expect(section).toBeVisible();
    const links = section
      .getByRole('list', { name: 'Price Drops aus unseren Videos' })
      .getByRole('link');
    await expect(links).toHaveCount(3);

    const fairmont = plain(await links.nth(0).textContent());
    expect(fairmont).toContain('Fairmont Hotel Vier Jahreszeiten');
    expect(fairmont).toContain('7 Nächte');
    expect(fairmont).toMatch(/Im Video vom .+: \u221221\s?%/);
    expect(fairmont).toContain('Läuft noch');

    // Cheaper today than in the video: today's prices, not the post's.
    const baur = plain(await links.nth(1).textContent());
    expect(baur).toContain('Baur au Lac');
    expect(baur).toContain('3.420 € statt 4.945 €');

    const claridges = plain(await links.nth(2).textContent());
    expect(claridges).toContain("Claridge's");
    expect(claridges).toContain('Vorbei');
    expect(claridges).toContain('Preis von heute ansehen');
    await expect(links.nth(2)).toHaveAttribute(
      'href',
      /^\/price-drops\/claridges-london\/\d{4}-\d{2}-\d{2}--\d{4}-\d{2}-\d{2}$/,
    );
  });

  test('only for bio-link visitors, in English too', async ({ page }) => {
    await page.goto('/dev/drops');
    await expect(page.getByRole('region', { name: 'Aus unseren Videos' })).toHaveCount(0);
    await page.goto('/en/dev/drops?ref=instagram');
    const section = page.getByRole('region', { name: 'From our videos' });
    expect(plain(await section.getByRole('link').first().textContent())).toMatch(
      /In our video of .+: \u221221\s?%/,
    );
  });

  test('the creator kit has "Gepostet auf" toggles per drop', async ({ page }) => {
    await page.goto('/dev/admin/drops');
    const kit = page.getByRole('list', { name: 'Price Drops' });
    const tiktok = kit.getByRole('button', { name: 'Baur au Lac auf TikTok gepostet' });
    await expect(tiktok).toHaveAttribute('aria-pressed', 'false');
    await expect(kit.getByRole('button', { name: /auf Instagram gepostet$/ })).toHaveCount(5);
  });
});
