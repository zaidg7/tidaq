/**
 * Public routes (PLAN §7), one place for the navbar, footer and sitemap. Paths are the German
 * ones; English pages live under `/en` (see `localizedPath` in core).
 */
export const routes = {
  home: '/',
  search: '/#suche',
  hotels: '/hotels',
  cities: '/staedte',
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

/** Navbar links (mockup B): Price Drops · Hotels · Städte. The rest lives in the footer. */
export const navRoutes = ['drops', 'hotels', 'cities'] as const satisfies readonly RouteKey[];

/** The phone menu has room for more: the navbar links, then how we measure. */
export const menuRoutes = [
  ...navRoutes,
  'checkoutCheck',
  'method',
] as const satisfies readonly RouteKey[];
