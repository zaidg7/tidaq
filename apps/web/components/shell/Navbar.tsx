import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { menuRoutes, navRoutes, routes } from '@/lib/routes';
import { LocaleLinks } from './LocaleLinks';
import { MobileMenu } from './MobileMenu';
import { NavSearch } from '@/components/search/NavSearch';
import { searchBarProps } from '@/lib/searchCardProps';
import { berlinToday } from '@/lib/today';
import { DROP_ALERT_ID } from '@/components/drops/alertId';
import { HeaderState } from './HeaderState';
import { NavLinks } from './NavLinks';

/**
 * Sticky navbar (PREMIUM.md §12, mockup B). Desktop: wordmark left, Price Drops · Hotels · Städte
 * centred, search, DE/EN and the Price Alert pill right. Phones: wordmark, search, menu. White and
 * see-through on a photo hero, frosted once the page scrolls (`.site-header` in globals.css,
 * `data-scrolled` from HeaderState). The search button leaves the bar while the page's own search
 * is on screen, so the bar never shows a gap.
 */
export async function Navbar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const tl = await getTranslations({ locale, namespace: 'localeSwitch' });
  const search = await searchBarProps(locale);
  const items = navRoutes.map((key) => ({ href: routes[key], label: t(key) }));
  const menuItems = menuRoutes.map((key) => ({ href: routes[key], label: t(key) }));
  const localeNames = { de: tl('de'), en: tl('en') };
  const alertHref = `${localizedPath(routes.drops, locale)}#${DROP_ALERT_ID}`;

  return (
    <header className="site-header sticky top-0 z-40">
      <noscript>
        {/* Without JavaScript nothing marks the scroll: keep the frosted, ink version. */}
        <style>{`.site-header{--nav-fg:#15131c!important;--nav-dim:#5b5866!important;--nav-pill-bg:#fff!important;--nav-pill-border:#d9d5e2!important;--nav-pill-fg:#15131c!important;background-color:rgba(250,249,247,.92)!important}`}</style>
      </noscript>
      <HeaderState />
      {/* `cn` doesn't merge conflicting classes, so the wrapper owns position and visibility. */}
      <div className="pointer-events-none absolute top-3 left-3 z-50 opacity-0 focus-within:pointer-events-auto focus-within:opacity-100">
        <a href="#inhalt" className={buttonClasses({ size: 'sm' })}>
          {t('skip')}
        </a>
      </div>
      <div className="mx-auto grid h-16 max-w-[1240px] grid-cols-[1fr_auto] items-center gap-2 pr-2 pl-[18px] md:pr-4 md:pl-6 lg:h-[76px] lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        <a
          href={localizedPath(routes.home, locale)}
          aria-label={t('home')}
          className="nav-link -ml-1 inline-flex h-11 items-center justify-self-start rounded-input px-1"
        >
          <Logo label={null} />
        </a>
        <NavLinks items={items} locale={locale} label={t('label')} />
        <div className="flex items-center justify-end gap-1 lg:gap-2">
          <NavSearch
            locale={locale}
            today={berlinToday()}
            guestOptions={search.guestOptions}
            labels={{
              ...search.labels,
              pillShort: t('searchShort'),
              open: t('search'),
              close: t('searchClose'),
              dialog: t('searchDialog'),
            }}
          />
          <LocaleLinks
            current={locale}
            label={tl('label')}
            names={{ de: 'DE', en: 'EN' }}
            fullNames={localeNames}
            className="hidden lg:block"
          />
          {/* `cn` doesn't merge conflicting classes: the wrapper hides the pill on phones. */}
          <div className="hidden lg:block">
            <a
              href={alertHref}
              className="nav-pill ml-1 inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold"
            >
              {t('cta')}
            </a>
          </div>
          <MobileMenu
            items={menuItems}
            locale={locale}
            localeNames={localeNames}
            labels={{
              open: t('menuOpen'),
              close: t('menuClose'),
              title: t('menuTitle'),
              language: tl('label'),
              alert: t('menuAlert'),
            }}
            alertHref={alertHref}
          />
        </div>
      </div>
    </header>
  );
}
