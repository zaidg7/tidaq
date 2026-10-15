import { expect, test } from '@playwright/test';

const plain = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ');

test.describe('drops on hotel and stay pages (C-080i)', () => {
  test('hotel page: the biggest drop with both prices, its other trips as chips', async ({
    page,
  }) => {
    await page.goto('/dev/hotel/calendar?drop');
    const callout = page.getByRole('complementary', { name: 'Preissturz bei diesem Hotel' });
    await expect(callout).toBeVisible();
    expect(plain(await callout.textContent())).toMatch(
      /5 Nächte\): 3\.420 € statt 4\.945 € am Vortag, −31 % bei Booking\.com\./,
    );
    await expect(callout.getByRole('link', { name: 'Zum Preissturz' })).toHaveAttribute(
      'href',
      /^\/preissturz\/baur-au-lac-zuerich\/\d{4}-\d{2}-\d{2}--\d{4}-\d{2}-\d{2}$/,
    );
    await expect(
      callout.getByRole('list', { name: 'Auch günstiger' }).getByRole('link'),
    ).toHaveCount(4);
  });

  test('stay page: only when this stay dropped', async ({ page }) => {
    await page.goto('/dev/stay/tracked?drop');
    const callout = page.getByRole('complementary', { name: 'Preissturz seit gestern' });
    expect(plain(await callout.textContent())).toContain(
      'Dieser Aufenthalt kostet heute 3.420 € statt 4.945 € am Vortag, −31 % bei Booking.com.',
    );
    await page.goto('/dev/stay/tracked');
    await expect(page.getByRole('complementary', { name: /Preissturz/ })).toHaveCount(0);
    await page.goto('/dev/hotel/calendar');
    await expect(page.getByRole('complementary', { name: /Preissturz/ })).toHaveCount(0);
  });
});
