import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Visual regression (C-006e): screenshots of the component gallery and the homepage hero at
 * 390 and 1280 px, compared with baselines made in CI's Linux image (font rendering differs
 * between machines, so local runs skip). New or changed baselines: run the "Visual baselines"
 * workflow for your branch; it commits `e2e/visual.spec.ts-snapshots/`. That bot commit does not
 * start CI (GitHub skips workflows for pushes made with GITHUB_TOKEN): pull it and push your next
 * real commit (e.g. the TASKS.md update) so CI checks the new baselines before merge.
 */
const SECTIONS = [
  'logo',
  'typografie',
  'farben',
  'icons',
  'buttons',
  'felder',
  'chips',
  'badges',
  'statechip',
  'urteil',
  'preisverlauf',
  'preistreue',
  'karten',
];

const WIDTHS = [390, 1280] as const;

async function prepare(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The sticky header would overlap element screenshots taken mid-page.
  await page.addStyleTag({ content: '.site-header { position: static !important; }' });
}

test.describe('visual', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CI, 'Baselines are made on CI; local font rendering differs.');
    test.skip(
      !process.env.UPDATE_BASELINES && !existsSync(test.info().snapshotDir),
      'No baselines yet: run the "Visual baselines" workflow.',
    );
  });

  for (const width of WIDTHS) {
    test(`component gallery at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await prepare(page, '/dev/ui');
      for (const id of SECTIONS) {
        await expect(page.locator(`section[id="${id}"]`), id).toHaveScreenshot(
          `${id}-${width}.png`,
        );
      }
    });

    test(`homepage hero at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await prepare(page, '/');
      await expect(page.locator('section').first()).toHaveScreenshot(`hero-${width}.png`);
    });
  }
});
