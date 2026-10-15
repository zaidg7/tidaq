import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { navRoutes, routes } from '@/lib/routes';
import { LocaleLinks } from './LocaleLinks';
import { MobileMenu } from './MobileMenu';
import { NavSearch } from '@/components/search/NavSearch';
import { searchBarProps } from '@/lib/searchCardProps';
import { berlinToday } from '@/lib/today';
import { DROP_ALERT_ID } from '@/components/drops/alertId';
import { NavLinks } from './NavLinks';

/**
 * Sticky navbar (PREMIUM.md §12): transparent at the top, frosted once the page scrolls
 * (`.site-header` in globals.css, pure CSS). Desktop: logo, links, language, search, Price Alert.
 * Mobile: logo, search, menu sheet. `NavSearch` opens the search in place (C-107b).
 */
export async function Navbar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const tl = await getTranslations({ locale, namespace: 'localeSwitch' });
  const search = await searchBarProps(locale);
  const items = navRoutes.map((key) => ({ href: routes[key], label: t(key) }));
  const localeNames = { de: tl('de'), en: tl('en') };

  return (
    <header className="site-header sticky top-0 z-40 border-b border-transparent">
      {/* `cn` doesn't merge conflicting classes, so the wrapper owns position and visibility. */}
      <div className="pointer-events-none absolute top-3 left-3 z-50 opacity-0 focus-within:pointer-events-auto focus-within:opacity-100">
        <a href="#inhalt" className={buttonClasses({ size: 'sm' })}>
          {t('skip')}
        </a>
      </div>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-4 md:px-6 lg:h-[72px] lg:px-10">
        <a
          href={localizedPath(routes.home, locale)}
          aria-label={t('home')}
          className="-ml-1 inline-flex h-11 items-center rounded-input px-1"
        >
          <Logo label={null} />
        </a>
        <div className="ml-4 flex-1">
          <NavLinks items={items} locale={locale} label={t('label')} />
        </div>
        <LocaleLinks
          current={locale}
          label={tl('label')}
          names={{ de: 'DE', en: 'EN' }}
          fullNames={localeNames}
          className="hidden lg:block"
        />
        <NavSearch
          locale={locale}
          today={berlinToday()}
          guestOptions={search.guestOptions}
          labels={{
            ...search.labels,
            pill: [t('pillWhere'), t('pillWhen'), t('pillWho')],
            open: t('search'),
            close: t('searchClose'),
            dialog: t('searchDialog'),
          }}
        />
        {/* `cn` doesn't merge conflicting classes: the wrapper hides the button on phones. */}
        <div className="ml-1 hidden lg:block">
          <a
            href={`${localizedPath(routes.drops, locale)}#${DROP_ALERT_ID}`}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            {t('cta')}
          </a>
        </div>
        <MobileMenu
          items={items}
          locale={locale}
          localeNames={localeNames}
          labels={{
            open: t('menuOpen'),
            close: t('menuClose'),
            title: t('menuTitle'),
            language: tl('label'),
            alert: t('menuAlert'),
          }}
          alertHref={`${localizedPath(routes.drops, locale)}#${DROP_ALERT_ID}`}
        />
      </div>
    </header>
  );
}
