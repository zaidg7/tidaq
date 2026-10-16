import { expect, test } from '@playwright/test';

const plain = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ');

test.describe('drops on hotel and stay pages (C-080i)', () => {
  test('hotel page: the biggest drop with both prices, its other trips as chips', async ({
    page,
  }) => {
    await page.goto('/dev/hotel/calendar?drop');
    const callout = page.getByRole('complementary', { name: 'Price Drop bei diesem Hotel' });
    await expect(callout).toBeVisible();
    expect(plain(await callout.textContent())).toMatch(
      /5 Nächte\): 3\.420 € bei Booking\.com, −31 % seit gestern\./,
    );
    await expect(callout.getByRole('link', { name: 'Zum Price Drop' })).toHaveAttribute(
      'href',
      /^\/price-drops\/baur-au-lac-zuerich\/\d{4}-\d{2}-\d{2}--\d{4}-\d{2}-\d{2}$/,
    );
    // Only dates that don't overlap the top trip or each other (C-125): 3 of Baur's 4 others.
    await expect(
      callout.getByRole('list', { name: 'Auch günstiger' }).getByRole('link'),
    ).toHaveCount(3);
  });

  test('stay page: only when this stay dropped', async ({ page }) => {
    await page.goto('/dev/stay/tracked?drop');
    const callout = page.getByRole('complementary', { name: 'Price Drop seit gestern' });
    expect(plain(await callout.textContent())).toContain(
      'Dieser Aufenthalt kostet heute 3.420 € bei Booking.com, −31 % seit gestern.',
    );
    await page.goto('/dev/stay/tracked');
    await expect(page.getByRole('complementary', { name: /Price Drop/ })).toHaveCount(0);
    await page.goto('/dev/hotel/calendar');
    await expect(page.getByRole('complementary', { name: /Price Drop/ })).toHaveCount(0);
  });
});
