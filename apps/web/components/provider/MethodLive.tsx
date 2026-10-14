import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonthYear,
  formatPercent,
  isProviderIndexable,
  localizedPath,
  percentOf,
  providerPath,
  type Locale,
} from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import type { ProviderFactsLoad } from '@/lib/data/providers';
import { TrustScore } from '@/components/ui/TrustScore';
import { FactGrid } from './FactGrid';
import { useProviderName } from './ProviderView';

/**
 * Live numbers on /methodik (C-034): catalog size, today's grid, the 30-day share of night sums
 * within 3 % of the real price (`night_accuracy`, C-070c), checkout tests, and every provider
 * with a page. Without data a one-line note; the method text below stays readable.
 */
export function MethodLive({ load }: { load: ProviderFactsLoad }) {
  const t = useTranslations('methodLive');
  const tp = useTranslations('provider');
  const locale = useLocale() as Locale;
  const nameOf = useProviderName();

  if (load.kind !== 'ok') {
    return (
      <p className="mt-10 max-w-[40em] rounded-cell bg-surface-2 px-4 py-3 text-[14px] text-muted-ink">
        {t('unavailable')}
      </p>
    );
  }
  const f = load.facts;
  const acc = f.accuracy;
  const accShare = percentOf(acc.stays_within_3, acc.stays);
  const providers = f.providers.filter(isProviderIndexable);
  const n = (v: number) => new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB').format(v);

  return (
    <div className="mt-10 grid gap-4">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-h3">{t('title')}</h2>
          {f.day && (
            <p className="text-meta text-muted-ink">
              {t('asOf', { date: formatDayMonthYear(f.day, locale) })}
            </p>
          )}
        </div>
        <FactGrid
          cols={4}
          className="mt-5"
          label={t('title')}
          facts={[
            { label: t('hotels'), value: n(f.hotels), hint: t('hotelsHint', { cities: f.cities }) },
            { label: t('nights'), value: n(f.nights), hint: t('nightsHint') },
            {
              label: t('accuracy'),
              value: accShare === null ? '–' : formatPercent(accShare / 100, locale),
              hint:
                accShare === null
                  ? t('accuracyNone')
                  : t('accuracyHint', { stays: n(acc.stays), days: acc.days }),
            },
            {
              label: t('tests'),
              value: n(f.tests.n),
              hint: t('testsHint', { providers: f.tests.providers }),
            },
          ]}
        />
      </Card>
      {providers.length > 0 && (
        <Card>
          <h2 id="anbieter" className="text-h3 scroll-mt-24">
            {t('providersTitle')}
          </h2>
          <p className="mt-2 text-[15px] text-muted-ink">{t('providersText')}</p>
          <ul className="mt-4 divide-y divide-line">
            {providers.map((p) => {
              const cheapest = percentOf(p.cheapest, p.compared);
              return (
                <li
                  key={p.slug}
                  className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
                >
                  <div className="min-w-0">
                    <a
                      href={localizedPath(providerPath(p.slug), locale)}
                      className="font-semibold text-accent underline-offset-2 after:absolute after:inset-0 hover:underline"
                    >
                      {nameOf(p)}
                    </a>
                    <p className="text-meta text-muted-ink">
                      {p.nights === 0
                        ? tp('gridNoneShort')
                        : cheapest !== null &&
                          tp('cheapestShare', { pct: formatPercent(cheapest / 100, locale) })}
                    </p>
                  </div>
                  <TrustScore
                    score={p.score}
                    tests={p.tests}
                    matches={p.matches}
                    className="shrink-0"
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
