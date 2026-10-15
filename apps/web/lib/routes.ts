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
  checkoutCheck: '/kassen-check',
  method: '/methodik',
  ranking: '/ranking',
  imprint: '/impressum',
  privacy: '/datenschutz',
  affiliate: '/affiliate-hinweis',
} as const;

export type RouteKey = keyof typeof routes;

/**
 * Navbar order (CRAFT.md §3 Navbar): Preisstürze · Hotels · Kassen-Check · So funktioniert's.
 * The radar (C-080a) took the place of Deals, which stays in the footer and on the radar page.
 */
export const navRoutes = [
  'drops',
  'hotels',
  'checkoutCheck',
  'method',
] as const satisfies readonly RouteKey[];
