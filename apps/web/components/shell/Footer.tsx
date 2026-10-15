import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { Logo } from '@/components/ui/Logo';
import { routes, type RouteKey } from '@/lib/routes';
import { LocaleLinks } from './LocaleLinks';

type FooterLink = Exclude<RouteKey, 'home' | 'search'>;
type Column = { title: 'explore' | 'about' | 'legal'; links: FooterLink[] };

const COLUMNS: Column[] = [
  { title: 'explore', links: ['drops', 'dropsWeek', 'hotels', 'cities', 'deals'] },
  { title: 'about', links: ['method', 'checkoutCheck', 'ranking', 'affiliate'] },
  { title: 'legal', links: ['imprint', 'privacy'] },
];
/** Phones (mockup B): the six links people look for, two columns, no headings. */
const PHONE: FooterLink[] = ['drops', 'method', 'hotels', 'affiliate', 'imprint', 'privacy'];
/** Shorter names where the column already gives the context. */
const LABEL: Partial<Record<FooterLink, 'affiliateShort'>> = { affiliate: 'affiliateShort' };

const link =
  'inline-flex min-h-9 items-center rounded-sm text-[15px] text-muted underline-offset-[0.2em] transition-colors duration-[var(--t-fast)] ease-out hover:text-ink hover:underline';

/**
 * Site footer (mockup B): wordmark and tagline, then Entdecken · Tidaq · Rechtliches, then one
 * quiet line on what the prices mean, the copyright and the language links.
 */
export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tl = await getTranslations({ locale, namespace: 'localeSwitch' });
  const label = (key: FooterLink) =>
    t(`links.${LABEL[key] ?? key}` as `links.${FooterLink | 'affiliateShort'}`);

  return (
    <footer className="mt-auto bg-bg">
      <div className="mx-auto max-w-[1240px] px-[18px] pt-10 pb-10 md:px-10 md:pt-[72px] md:pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:justify-between md:gap-10">
          <div className="md:max-w-[340px] md:flex-[1_1_260px]">
            <Logo label={t('about')} />
            <p className="mt-3.5 hidden text-[15px] text-muted md:block">{t('tagline')}</p>
          </div>
          <nav aria-label={t('explore')} className="grid grid-cols-2 gap-x-4 md:hidden">
            {PHONE.map((key) => (
              <a key={key} href={localizedPath(routes[key], locale)} className={link}>
                {label(key)}
              </a>
            ))}
          </nav>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={t(col.title)} className="hidden md:block">
              <h2 className="text-[15px] font-semibold text-ink">{t(col.title)}</h2>
              <ul className="mt-2 flex flex-col">
                {col.links.map((key) => (
                  <li key={key}>
                    <a href={localizedPath(routes[key], locale)} className={link}>
                      {label(key)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-[13px] text-faint md:mt-12 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="max-w-[60em]">
            {t('note')} <span className="whitespace-nowrap">{t('copyright', { year: 2026 })}</span>
          </p>
          <LocaleLinks
            current={locale}
            label={tl('label')}
            names={{ de: tl('de'), en: tl('en') }}
            className="-ml-2.5 shrink-0 md:ml-0 md:-mr-2.5"
          />
        </div>
      </div>
    </footer>
  );
}
