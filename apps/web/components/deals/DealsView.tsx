import { useLocale, useTranslations } from 'next-intl';
import { TrendingDown } from 'lucide-react';
import { DEALS, localizedPath, type Locale } from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { PageHead } from '@/components/shell/PageHead';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Deal } from '@/lib/data/deals';
import { routes } from '@/lib/routes';
import { DealCard, dealMetaValues } from './DealCard';
import { NewsletterForm } from './NewsletterForm';

/**
 * `/deals` (C-025): every upcoming stay at least 8 % under its own 30-day average with 14+ days
 * of history, biggest drop first, one per hotel; city chips filter by URL (`?stadt=berlin`).
 * Below them the weekly deals newsletter sign-up (C-054a).
 */
export function DealsView({ deals, city }: { deals: Deal[]; city: string | null }) {
  const t = useTranslations('deals');
  const locale = useLocale() as Locale;
  const cities = [...new Map(deals.map((d) => [d.citySlug, d.cityName[locale]]))].sort((a, b) =>
    a[1].localeCompare(b[1], locale),
  );
  const shown = city ? deals.filter((d) => d.citySlug === city) : deals;
  const minPct = Math.round(-DEALS.minDrop * 100);
  const base = localizedPath(routes.deals, locale);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 pb-16 md:px-10 md:pt-12 md:pb-24">
      <PageHead
        pill={t('eyebrow')}
        title={t('pageTitle')}
        lead={t('intro', { pct: minPct, days: DEALS.minDays })}
      />

      {deals.length === 0 ? (
        <Card variant="float" radius="search" className="mt-10 max-w-[44em] lg:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon icon={TrendingDown} size={24} />
          </span>
          <h2 className="text-h3 mt-4">{t('emptyTitle')}</h2>
          <p className="mt-1 text-[15px] text-muted-ink">
            {t('emptyText', { pct: minPct, days: DEALS.minDays })}
          </p>
          <a
            href={localizedPath(routes.hotels, locale)}
            className={cn(buttonClasses({ variant: 'ghost' }), 'mt-6')}
          >
            {t('emptyCta')}
          </a>
        </Card>
      ) : (
        <>
          {cities.length > 1 && (
            <nav aria-label={t('filterLabel')} className="mt-8">
              {/* Text tabs, the chosen one underlined (C-137: no pills). */}
              <ul className="flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none] md:gap-8">
                {[['', t('allCities')] as const, ...cities].map(([slug, name]) => {
                  const on = slug ? city === slug : !city;
                  return (
                    <li key={slug || 'all'} className="shrink-0">
                      <a
                        href={slug ? `${base}?stadt=${slug}` : base}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'relative flex h-12 items-center text-[15px] font-semibold whitespace-nowrap',
                          'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full',
                          on ? 'text-ink after:bg-ink' : 'text-muted hover:text-ink',
                        )}
                      >
                        {name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((d) => (
              <li key={d.stayId}>
                <DealCard deal={d} locale={locale} meta={t('meta', dealMetaValues(d, locale))} />
              </li>
            ))}
          </ul>
        </>
      )}

      <section aria-labelledby="newsletter-title" className="mt-14">
        <Card className="grid gap-6 lg:grid-cols-2 lg:gap-10 lg:p-8">
          <div>
            <h2 id="newsletter-title" className="text-h3">
              {t('newsletterTitle')}
            </h2>
            <p className="mt-2 max-w-[30em] text-[15px] text-muted-ink">{t('newsletterText')}</p>
          </div>
          <NewsletterForm
            locale={locale}
            labels={{
              email: t('newsletterEmail'),
              consent: t('newsletterConsent'),
              privacy: t('newsletterPrivacy'),
              privacyHref: `${localizedPath(routes.privacy, locale)}#${locale === 'de' ? '6-preisalarm-und-deals-per-e-mail' : '6-price-alerts-and-deals-by-email'}`,
              submit: t('newsletterSubmit'),
              preview: t('newsletterPreview'),
              results: {
                sent: t('newsletterResults.sent'),
                added: t('newsletterResults.added'),
                invalid: t('newsletterResults.invalid'),
                too_soon: t('newsletterResults.too_soon'),
                rate_limited: t('newsletterResults.rate_limited'),
                bot: t('newsletterResults.bot'),
                error: t('newsletterResults.error'),
              },
            }}
          />
        </Card>
      </section>
    </div>
  );
}
