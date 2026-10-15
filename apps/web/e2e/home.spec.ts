import { expect, test } from '@playwright/test';

// Homepage (C-020b1). CI has no Supabase: the live example shows the labelled sample.
test.describe('homepage', () => {
  test('hero, proof row and a labelled sample without live data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Ist dein Hotelpreis gerade tief oder hoch?',
    );
    await expect(page.getByText(/^Jeden Morgen prüfen wir/)).toBeVisible();
    const live = page.getByRole('region', { name: 'Ist jetzt ein guter Moment zum Buchen?' });
    await expect(live.getByText('Beispieldaten')).toBeVisible();
    await expect(live.getByRole('slider')).toBeVisible();
    await expect(live.getByText('Günstigster')).toBeVisible();
  });

  test('how it works, the labelled checkout example and the closing CTA', async ({ page }) => {
    await page.goto('/');
    const how = page.getByRole('region', { name: 'Drei Schritte zum richtigen Moment' });
    await expect(how.getByRole('listitem')).toHaveCount(3);
    const checkout = page.getByRole('region', {
      name: 'Der günstigste Preis ist nicht immer der echte',
    });
    await expect(checkout.getByText('Beispiel-Test')).toBeVisible();
    await expect(checkout.getByText(/^Beispiel\./)).toBeVisible();
    // Without 14+ days of data there are no deals, and the section is not rendered at all.
    await expect(page.getByRole('region', { name: 'Fünf-Sterne-Deals dieser Woche' })).toHaveCount(
      0,
    );
    await page
      .getByRole('heading', { name: 'Finde den richtigen Moment für dein Hotel.' })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Preise ansehen' }),
    ).toHaveCount(0);
  });
});

test('hotel photos are served from our own domain (C-011c)', async ({ request }) => {
  for (const file of [
    'hotel-adlon-kempinski-berlin-160.webp',
    'hotel-adlon-kempinski-berlin-960.webp',
  ]) {
    const res = await request.get(`/hotels/${file}`);
    expect(res.status(), file).toBe(200);
    expect(res.headers()['content-type'], file).toContain('image/webp');
  }
});
