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
                'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[14px] font-semibold',
                'transition-colors duration-[180ms] ease-soft',
                locale === current
                  ? 'text-fg'
                  : 'text-muted-ink hover:bg-accent-soft hover:text-fg',
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
