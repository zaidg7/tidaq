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

  test('search explains what is missing and focuses the field', async ({ page }) => {
    await page.goto('/');
    const form = page.getByRole('form', { name: 'Preise suchen' });
    await form.getByRole('button', { name: 'Preise ansehen' }).click();
    await expect(form.getByRole('alert')).toHaveText('Wähl ein Hotel.');
    await expect(form.getByLabel('Hotel', { exact: true })).toBeFocused();
  });

  test('the navbar CTA hides while the search card is visible and leads back to it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const cta = page.getByRole('banner').getByRole('link', { name: 'Preise ansehen' });
    await expect(cta).toHaveCount(0); // aria-hidden while the card is on screen
    await page.mouse.wheel(0, 1400);
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/#suche$/);
    await expect(page.getByRole('form', { name: 'Preise suchen' })).toBeInViewport();
  });

  test('a fixed field clears its error', async ({ page }) => {
    await page.goto('/');
    const form = page.getByRole('form', { name: 'Preise suchen' });
    await form.getByRole('button', { name: 'Preise ansehen' }).click();
    await expect(form.getByRole('alert')).toHaveText('Wähl ein Hotel.');
    // Picking a check-in (today, focused when the picker opens) doesn't clear the hotel error.
    await page.keyboard.press('Escape'); // the error focused the hotel field and opened its list
    await form.getByRole('button', { name: /^Anreise/ }).click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(form.getByRole('alert')).toHaveText('Wähl ein Hotel.');
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
