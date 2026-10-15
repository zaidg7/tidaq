import { expect, test, type Page } from '@playwright/test';

// Desktop search bar (C-107) on /dev/search: sample catalog, sample drops.
test.use({ viewport: { width: 1280, height: 900 } });

const bar = (page: Page) => page.getByRole('form', { name: 'Preise suchen' });
const where = (page: Page) => bar(page).getByRole('combobox', { name: 'Hotel oder Stadt' });
const list = (page: Page) => page.getByRole('listbox', { name: 'Ziele' });

test.describe('search bar', () => {
  test('empty field: popular cities with photos and today’s cheapest hotels', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).click();
    await expect(where(page)).toHaveAttribute('aria-expanded', 'true');
    const popular = list(page).getByRole('group', { name: 'Beliebte Städte' });
    await expect(popular.getByRole('option')).toHaveCount(8);
    await expect(popular.getByRole('option', { name: 'Berlin' })).toBeVisible();
    // City chips carry the self-hosted 160 px city photo.
    await expect(popular.getByRole('option', { name: 'Berlin' }).locator('img')).toHaveAttribute(
      'src',
      '/cities/berlin-160.webp',
    );
    const cheap = list(page).getByRole('group', { name: 'Gerade günstig' });
    await expect(cheap.getByRole('option')).toHaveCount(3);
    await expect(cheap.getByRole('option').first()).toContainText('Baur au Lac');
    await expect(cheap.getByRole('option').first()).toContainText('−31 %');
  });

  test('typing filters cities and hotels without accents and marks the match', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('zue');
    const cities = list(page).getByRole('group', { name: 'Städte' });
    await expect(cities.getByRole('option')).toHaveCount(1);
    await expect(cities.getByRole('option')).toContainText('Stadt · 2 Hotels');
    await expect(cities.locator('mark')).toHaveText('Zü');
    const hotels = list(page).getByRole('group', { name: 'Hotels' });
    await expect(hotels.getByRole('option')).toHaveCount(2);
    await expect(hotels.getByRole('option', { name: /Baur au Lac/ })).toContainText('Price Drop');
    await expect(page.getByText('3 Treffer')).toBeAttached();

    await where(page).fill('xyz');
    await expect(list(page)).toContainText('Nichts gefunden. Versuch eine Stadt');
  });

  test('keyboard: ↓ and Enter pick, focus moves on to the dates', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('zue');
    await expect(list(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(where(page)).toHaveValue('Zürich');
    await expect(where(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(bar(page).getByRole('button', { name: /^Reisedaten/ })).toBeFocused();
  });

  test('Esc closes the panel, a second Esc clears the field', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('ber');
    await page.keyboard.press('Escape');
    await expect(where(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(where(page)).toHaveValue('ber');
    await page.keyboard.press('Escape');
    await expect(where(page)).toHaveValue('');
  });

  test('nothing picked: the field shakes, explains and opens the panel', async ({ page }) => {
    await page.goto('/dev/search');
    await bar(page).getByRole('button', { name: 'Preis prüfen' }).click();
    await expect(bar(page).getByRole('alert')).toHaveText('Wähl ein Hotel oder eine Stadt.');
    await expect(where(page)).toBeFocused();
    await expect(where(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(list(page)).toBeVisible();
  });

  test('a hotel opens the calendar; without dates it goes to the hotel page', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('dolder');
    await list(page)
      .getByRole('option', { name: /The Dolder Grand/ })
      .click();
    const picker = page.getByRole('dialog', { name: 'Reisedaten' });
    await expect(picker).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await bar(page).getByRole('button', { name: 'Preis prüfen' }).click();
    await expect(page).toHaveURL(/\/hotel\/the-dolder-grand-zuerich$/);
  });

  test('a city goes to the city page', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).click();
    await list(page).getByRole('option', { name: 'Wien', exact: true }).click();
    await expect(where(page)).toHaveValue('Wien');
    await bar(page).getByRole('button', { name: 'Preis prüfen' }).click();
    await expect(page).toHaveURL(/\/stadt\/wien$/);
  });

  test('English labels', async ({ page }) => {
    await page.goto('/en/dev/search');
    const form = page.getByRole('form', { name: 'Search prices' });
    await form.getByRole('combobox', { name: 'Hotel or city' }).fill('munich');
    await expect(page.getByRole('listbox', { name: 'Destinations' })).toContainText(
      'City · 3 hotels',
    );
  });
});

test.describe('dates and guests (C-108)', () => {
  test('a picked hotel tints the calendar with its nightly prices', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('dolder');
    await page.keyboard.press('Enter');
    const dates = page.getByRole('dialog', { name: 'Reisedaten' });
    await expect(dates).toBeVisible();
    // The compact popover (C-136) keeps the cheap → dear legend.
    await expect(dates.getByText('günstiger')).toBeVisible();
    // Keyboard focus lands on today, which names its price.
    await expect(dates.locator('td:focus')).toHaveAttribute('aria-label', /heute, .+ pro Nacht/);
    await expect(dates.getByRole('gridcell', { name: /pro Nacht/ }).first()).toBeVisible();
  });

  test('range, Weiter, guests stepper and submit with adults', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('dolder');
    await page.keyboard.press('Enter');
    const dates = page.getByRole('dialog', { name: 'Reisedaten' });
    // From today: → (tomorrow) Enter = check-in, → → Enter = check-out two nights later.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dates.getByText(/^2 Nächte · /)).toBeVisible();
    await expect(bar(page).getByRole('button', { name: /^Reisedaten · 2 Nächte/ })).toBeVisible();

    await dates.getByRole('button', { name: 'Weiter' }).click();
    const guests = page.getByRole('dialog', { name: 'Gäste' });
    await expect(guests.getByRole('button', { name: 'Ein Erwachsener mehr' })).toBeFocused();
    await guests.getByRole('button', { name: 'Ein Erwachsener mehr' }).click();
    await expect(bar(page).getByRole('button', { name: /^Gäste 3 Erwachsene/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(guests).toBeHidden();
    await expect(bar(page).getByRole('button', { name: /^Gäste/ })).toBeFocused();

    await bar(page).getByRole('button', { name: 'Preis prüfen' }).click();
    await expect(page).toHaveURL(
      /\/hotel\/the-dolder-grand-zuerich\/\d{4}-\d\d-\d\d--\d{4}-\d\d-\d\d\?adults=3$/,
    );
  });

  test('Esc and a click outside close the calendar', async ({ page }) => {
    await page.goto('/dev/search');
    const trigger = bar(page).getByRole('button', { name: /^Reisedaten/ });
    await trigger.click();
    const dates = page.getByRole('dialog', { name: 'Reisedaten' });
    await expect(dates).toBeVisible();
    // A city or no destination: no prices in the cells.
    await expect(dates.getByRole('gridcell', { name: /pro Nacht/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dates).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(20, 20);
    await expect(dates).toBeHidden();
  });

  test('Flexibel: the cheapest weekends of a month as cards', async ({ page }) => {
    await page.goto('/dev/search');
    await where(page).fill('dolder');
    await page.keyboard.press('Enter');
    const dates = page.getByRole('dialog', { name: 'Reisedaten' });
    await dates.getByRole('radio', { name: 'Flexibel' }).click();
    await expect(dates.getByText('Ein Wochenende im')).toBeVisible();
    // Next month always has its weekends in the sample grid (120 nights). A month stepper, not
    // pills (C-137).
    await dates.getByRole('button', { name: 'Nächster Monat' }).click();
    const cards = dates.getByRole('listitem');
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText('Am günstigsten');
    await expect(cards.first()).toContainText(/für 2 Nächte/);
    await cards.first().getByRole('button').click();
    await expect(page.getByRole('dialog', { name: 'Gäste' })).toBeVisible();
    await expect(bar(page).getByRole('button', { name: /^Reisedaten · 2 Nächte/ })).toBeVisible();
  });

  test('a city with dates goes to the city page sorted for those dates (C-110)', async ({
    page,
  }) => {
    await page.goto('/dev/search');
    await where(page).fill('wien');
    await page.keyboard.press('Enter'); // the city is the first option
    await bar(page)
      .getByRole('button', { name: /^Reisedaten/ })
      .click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await bar(page).getByRole('button', { name: 'Preis prüfen' }).click();
    await expect(page).toHaveURL(/\/stadt\/wien\?daten=[\d-]+--[\d-]+&adults=2$/);
  });
});
