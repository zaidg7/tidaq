import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { Logo } from '@/components/ui/Logo';
import { routes, type RouteKey } from '@/lib/routes';
import { LocaleLinks } from './LocaleLinks';

type FooterLink = Exclude<RouteKey, 'home' | 'search'>;
type Column = { title: 'explore' | 'transparency' | 'legal'; links: FooterLink[] };

const COLUMNS: Column[] = [
  { title: 'explore', links: ['drops', 'hotels', 'deals'] },
  { title: 'transparency', links: ['method', 'checkoutCheck', 'ranking', 'affiliate'] },
  { title: 'legal', links: ['imprint', 'privacy'] },
];

const link =
  'rounded-sm underline-offset-[0.2em] transition-colors duration-[180ms] ease-soft hover:text-fg hover:underline';

/** Site footer (CRAFT.md §3 Footer): a `--surface-2` band with three link columns. */
export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tl = await getTranslations({ locale, namespace: 'localeSwitch' });

  return (
    <footer className="mt-auto border-t border-line bg-surface-2">
      <div className="mx-auto max-w-[1080px] px-5 pt-14 pb-10 md:px-7">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8">
          <div className="flex flex-col items-start gap-3">
            <Logo label="Tidaq" />
            <p className="text-meta max-w-[30ch] text-muted-ink">{t('tagline')}</p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={t(col.title)}>
              <h2 className="text-[13.5px] font-bold text-fg">{t(col.title)}</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {col.links.map((key) => (
                  <li key={key}>
                    <a
                      href={localizedPath(routes[key], locale)}
                      className={`${link} inline-flex min-h-8 items-center text-[13.5px] text-muted-ink`}
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
