import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { Logo } from '@/components/ui/Logo';
import { routes, type RouteKey } from '@/lib/routes';
import { LocaleLinks } from './LocaleLinks';

type FooterLink = Exclude<RouteKey, 'home' | 'search'>;
type Column = { title: 'explore' | 'transparency' | 'legal'; links: FooterLink[] };

const COLUMNS: Column[] = [
  { title: 'explore', links: ['drops', 'dropsWeek', 'hotels', 'deals'] },
  { title: 'transparency', links: ['method', 'checkoutCheck', 'ranking', 'affiliate'] },
  { title: 'legal', links: ['imprint', 'privacy'] },
];

const link =
  'rounded-sm underline-offset-[0.2em] transition-colors duration-[var(--t-fast)] ease-out hover:text-ink hover:underline';

/**
 * Site footer (PREMIUM.md §12): `--bg` with a top border, wordmark + tagline, three link
 * columns (two per row on phones), then copyright, cookie/affiliate line and language switch.
 */
export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tl = await getTranslations({ locale, namespace: 'localeSwitch' });

  return (
    <footer className="mt-auto border-t border-line bg-bg">
      <div className="mx-auto max-w-[1240px] px-4 pt-14 pb-10 md:px-6 lg:px-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-8">
          <div className="col-span-2 flex flex-col items-start gap-3 md:col-span-1">
            <Logo />
            <p className="text-small max-w-[30ch] text-muted-ink">{t('tagline')}</p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={t(col.title)}>
              <h2 className="text-label text-ink">{t(col.title)}</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {col.links.map((key) => (
                  <li key={key}>
                    <a
                      href={localizedPath(routes[key], locale)}
                      className={`${link} inline-flex min-h-9 items-center text-small text-muted-ink`}
                    >
                      {t(`links.${key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="text-meta mt-12 flex flex-col gap-3 border-t border-line pt-6 text-muted-ink md:flex-row md:items-center md:justify-between">
          <p>
            {t('copyright', { year: 2026 })} · {t('source')}
          </p>
          <LocaleLinks
            current={locale}
            label={tl('label')}
            names={{ de: tl('de'), en: tl('en') }}
            className="-ml-3 md:ml-0 md:-mr-3"
          />
        </div>
      </div>
    </footer>
  );
}
