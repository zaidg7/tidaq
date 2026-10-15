'use client';

import { usePathname } from 'next/navigation';
import { localizedPath, splitLocale, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

export type NavItem = { href: string; label: string };

/** True when `pathname` is `href` or a page below it (`/deals/berlin` for `/deals`). */
function isCurrent(pathname: string, href: string) {
  const { path } = splitLocale(pathname);
  const target = href.split('#')[0] || '/';
  return target === '/' ? path === '/' : path === target || path.startsWith(`${target}/`);
}

/**
 * Desktop navbar links (mockup B): 16 px, medium; the current page is semibold with a 4 px dot.
 * Colours come from the navbar (white on a photo, ink elsewhere).
 * Client only for `usePathname`; labels and hrefs come from the server, so no i18n runtime ships.
 */
export function NavLinks({
  items,
  locale,
  label,
}: {
  items: NavItem[];
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <a
                href={localizedPath(item.href, locale)}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'nav-link relative inline-flex h-11 items-center rounded-full px-4 text-[16px] font-medium',
                  current &&
                    'font-semibold after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-current after:content-[""]',
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
