import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Automated accessibility checks (C-041a, CLAUDE.md rule 10): axe-core with the WCAG 2.1 A/AA
 * rules on every key page, with sample data where the real route needs the database. Serious
 * and critical findings and skipped heading levels fail the build; contrast is part of the AA set.
 */
const PAGES = [
  '/',
  '/en',
  '/dev/stay/tracked',
  '/dev/stay/collecting',
  '/dev/stay/nights',
  '/en/dev/stay/tracked',
  '/dev/hotel/calendar',
  '/dev/hotel/empty',
  '/dev/city',
  '/dev/hotels',
  '/dev/deals',
  '/dev/drops',
  '/dev/drops?teaser',
  '/en/dev/drops',
  '/preissturz',
  '/dev/provider?p=booking-com',
  '/dev/provider?p=method',
  '/dev/watch',
  '/dev/admin',
  '/dev/ui',
  '/methodik',
  '/impressum',
  '/datenschutz',
  '/ranking',
  '/affiliate-hinweis',
  '/gibt-es-nicht',
];

/** Desktop layouts differ most on these; every page runs at phone width. */
const DESKTOP = new Set(['/', '/dev/stay/tracked', '/dev/hotel/calendar', '/dev/drops']);

for (const path of PAGES) {
  for (const width of DESKTOP.has(path) ? [390, 1280] : [390]) {
    test(`${path} at ${width} px has no serious accessibility issues`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const serious = results.violations
        // Heading order is only "moderate" for axe, but a skipped level confuses screen-reader
        // navigation by headings (C-041b, Lighthouse found one).
        .filter(
          (v) => v.impact === 'serious' || v.impact === 'critical' || v.id === 'heading-order',
        )
        .map((v) => ({
          rule: v.id,
          help: v.help,
          nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        }));
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
}
