import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { navRoutes, routes } from '@/lib/routes';
import { cn } from '@/lib/cn';
import { LocaleLinks } from './LocaleLinks';
import { MobileMenu } from './MobileMenu';
import { NavLinks } from './NavLinks';

const iconLink = cn(
  'inline-grid size-11 shrink-0 place-items-center rounded-full text-fg',
  'transition-colors duration-[180ms] ease-soft hover:bg-accent-soft',
);

/**
 * Sticky navbar (CRAFT.md §3 Navbar): transparent at the top, frosted once the page scrolls
 * (`.site-header` in globals.css, pure CSS). Desktop: logo, links, language, search, CTA.
 * Mobile: logo, search, menu sheet.
 */
export async function Navbar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const tl = await getTranslations({ locale, namespace: 'localeSwitch' });
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
      <div className="mx-auto flex h-[60px] max-w-[1080px] items-center gap-2 px-5 md:px-7 lg:h-[72px]">
        <a
          href={localizedPath(routes.home, locale)}
          aria-label={t('home')}
          className="-ml-1 inline-flex h-11 items-center rounded-cell px-1"
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
        <a
          href={localizedPath(routes.search, locale)}
          aria-label={t('search')}
          className={iconLink}
        >
          <Icon icon={Search} />
        </a>
        <span className="ml-1 hidden lg:block">
          <a href={localizedPath(routes.search, locale)} className={buttonClasses({ size: 'sm' })}>
            {t('cta')}
          </a>
        </span>
        <MobileMenu
          items={items}
          locale={locale}
          localeNames={localeNames}
          labels={{
            open: t('menuOpen'),
            close: t('menuClose'),
            title: t('menuTitle'),
            language: tl('label'),
          }}
        />
      </div>
    </header>
  );
}
