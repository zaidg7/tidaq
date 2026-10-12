'use client';

import { useLocale, useTranslations } from 'next-intl';
import { locales } from '@tidaq/core';
import { Link, usePathname } from '@/i18n/navigation';

/** Links to the current page in every locale. Styling follows in C-006/C-020a. */
export function LocaleSwitch() {
  const t = useTranslations('localeSwitch');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex gap-3">
        {locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              hrefLang={locale}
              aria-current={locale === current ? 'true' : undefined}
              className={locale === current ? 'font-semibold' : 'underline'}
            >
              {t(locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
