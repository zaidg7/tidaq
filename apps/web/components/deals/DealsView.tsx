import { useLocale, useTranslations } from 'next-intl';
import { TrendingDown } from 'lucide-react';
import { DEALS, localizedPath, type Locale } from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipLink } from '@/components/ui/Chip';
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
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[40em]">
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h1 className="text-h2 mt-2">{t('pageTitle')}</h1>
        <p className="text-lead mt-4 text-muted-ink">
          {t('intro', { pct: minPct, days: DEALS.minDays })}
        </p>
      </header>

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
              <ul className="flex flex-wrap gap-2">
                <li>
                  <ChipLink href={base} selected={!city}>
                    {t('allCities')}
                  </ChipLink>
                </li>
                {cities.map(([slug, name]) => (
                  <li key={slug}>
                    <ChipLink href={`${base}?stadt=${slug}`} selected={city === slug}>
                      {name}
                    </ChipLink>
                  </li>
                ))}
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
                error: t('newsletterResults.error'),
              },
            }}
          />
        </Card>
      </section>
    </div>
  );
}
