'use client';

import { usePathname } from 'next/navigation';
import { localizedPath, locales, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  current: Locale;
  /** Accessible name of the group, e.g. "Sprache". */
  label: string;
  /** Visible names per locale: { de: 'Deutsch', en: 'English' } or short codes. */
  names: Record<Locale, string>;
  /** Accessible names when `names` are short codes ("EN" → "English"). */
  fullNames?: Record<Locale, string>;
  className?: string;
};

/**
 * Links to the current page in every locale. Plain anchors with hreflang: no i18n runtime and
 * no cookie (D-15). Replaces the old next-intl client switch (~100 kB of JS on `/`).
 */
export function LocaleLinks({ current, label, names, fullNames, className }: Props) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-0.5">
        {locales.map((locale) => (
          <li key={locale}>
            <a
              href={localizedPath(pathname, locale)}
              hrefLang={locale}
              lang={locale}
              aria-label={fullNames?.[locale]}
              aria-current={locale === current ? 'true' : undefined}
              className={cn(
                'nav-link inline-flex h-11 min-w-10 items-center justify-center rounded-full px-2.5 text-[15px]',
                locale === current ? 'font-semibold' : 'nav-dim',
              )}
            >
              {names[locale]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
