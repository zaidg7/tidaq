/**
 * Public routes (PLAN §7), one place for the navbar, footer and sitemap. Paths are the German
 * ones; English pages live under `/en` (see `localizedPath` in core).
 */
export const routes = {
  home: '/',
  search: '/#suche',
  hotels: '/hotels',
  deals: '/deals',
  drops: '/preissturz',
  dropsWeek: '/preissturz/woche',
  // The Kassen-Check page comes with C-119; until then the provider scores on the method page.
  checkoutCheck: '/methodik#anbieter',
  method: '/methodik',
  ranking: '/ranking',
  imprint: '/impressum',
  privacy: '/datenschutz',
  affiliate: '/affiliate-hinweis',
} as const;

export type RouteKey = keyof typeof routes;

/**
 * Navbar order (PREMIUM.md §12): Price Drops · Hotels · Kassen-Check · So messen wir.
 * Deals stays in the footer and on the radar page.
 */
export const navRoutes = [
  'drops',
  'hotels',
  'checkoutCheck',
  'method',
] as const satisfies readonly RouteKey[];
