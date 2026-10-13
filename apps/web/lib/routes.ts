/**
 * Public routes (PLAN §7), one place for the navbar, footer and sitemap. Paths are the German
 * ones; English pages live under `/en` (see `localizedPath` in core).
 */
export const routes = {
  home: '/',
  search: '/#suche',
  hotels: '/hotels',
  deals: '/deals',
  checkoutCheck: '/kassen-check',
  method: '/methodik',
  ranking: '/ranking',
  imprint: '/impressum',
  privacy: '/datenschutz',
  affiliate: '/affiliate-hinweis',
} as const;

export type RouteKey = keyof typeof routes;

/** Navbar order (CRAFT.md §3 Navbar): Hotels · Deals · Kassen-Check · So funktioniert's. */
export const navRoutes = [
  'hotels',
  'deals',
  'checkoutCheck',
  'method',
] as const satisfies readonly RouteKey[];
