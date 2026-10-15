import { useLocale, useTranslations } from 'next-intl';
import {
  extrasByCount,
  formatDayMonthYear,
  formatPercent,
  isProviderIndexable,
  localizedPath,
  NIGHT_GRID,
  percentOf,
  providerPath,
  TRUST,
  type Locale,
  type ProviderFact,
  type ProviderFacts,
} from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { TrustScore } from '@/components/ui/TrustScore';
import { PageHead } from '@/components/shell/PageHead';
import { routes } from '@/lib/routes';
import { FactGrid, type Fact } from './FactGrid';

/** "Direkt beim Hotel" for the direct channel, else the provider's own name. */
export function useProviderName() {
  const t = useTranslations('provider');
  return (p: Pick<ProviderFact, 'name' | 'is_direct'>) => (p.is_direct ? t('directName') : p.name);
}

/**
 * Provider page (C-034): what our checkout tests and today's night grid show about one booking
 * site. Facts only, each with its sample and date (CLAUDE.md rule 8); no ranking, no verdict.
 */
export function ProviderView({
  provider,
  facts,
}: {
  provider: ProviderFact;
  facts: ProviderFacts;
}) {
  const t = useTranslations('provider');
  const locale = useLocale() as Locale;
  const nameOf = useProviderName();
  const name = nameOf(provider);
  const others = facts.providers.filter((p) => p.slug !== provider.slug && isProviderIndexable(p));

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 pb-16 md:px-10 md:pt-12 md:pb-24">
      <PageHead
        pill={
          <a
            href={`${localizedPath(routes.method, locale)}#anbieter`}
            className="underline-offset-2 hover:underline"
          >
            {t('eyebrow')}
          </a>
        }
        title={name}
        lead={t('intro', { name })}
      />

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <TrustCard provider={provider} name={name} locale={locale} />
        <GridCard provider={provider} facts={facts} name={name} locale={locale} />
      </div>

      <nav aria-label={t('others')} className="mt-10 max-w-[40em]">
        <p className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          <a
            href={localizedPath(routes.method, locale)}
            className="font-semibold text-accent underline underline-offset-2 hover:no-underline"
          >
            {t('methodLink')}
          </a>
          <a
            href={localizedPath(routes.ranking, locale)}
            className="font-semibold text-accent underline underline-offset-2 hover:no-underline"
          >
            {t('rankingLink')}
          </a>
        </p>
        {others.length > 0 && (
          <>
            <h2 className="text-meta mt-8 font-semibold text-muted-ink">{t('others')}</h2>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {others.map((p) => (
                <li key={p.slug}>
                  <a
                    href={localizedPath(providerPath(p.slug), locale)}
                    className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent underline-offset-4 hover:underline"
                  >
                    {nameOf(p)}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    </div>
  );
}

function TrustCard({
  provider: p,
  name,
  locale,
}: {
  provider: ProviderFact;
  name: string;
  locale: Locale;
}) {
  const t = useTranslations('provider');
  const extras = extrasByCount(p.extras);
  const facts: Fact[] = [
    { label: t('tests'), value: count(p.tests, locale) },
    { label: t('matched'), value: count(p.matches, locale) },
    { label: t('higher'), value: count(p.higher, locale) },
    { label: t('unavailable'), value: count(p.unavailable, locale) },
  ];
  if (p.lower > 0) facts.splice(3, 0, { label: t('lower'), value: count(p.lower, locale) });
  if (p.avg_markup_pct !== null) {
    facts.push({
      label: t('markup'),
      value: formatPercent(p.avg_markup_pct / 100, locale, { signed: true, digits: 1 }),
      hint: t('markupHint'),
    });
  }
  const period =
    p.first_test && p.last_test
      ? p.first_test === p.last_test
        ? t('testDay', { date: formatDayMonthYear(p.last_test, locale) })
        : t('testPeriod', {
            from: formatDayMonthYear(p.first_test, locale),
            to: formatDayMonthYear(p.last_test, locale),
          })
      : null;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-h3">{t('trustTitle')}</h2>
        <TrustScore
          score={p.score}
          tests={p.tests}
          matches={p.matches}
          withSample={false}
          className="shrink-0"
        />
      </div>
      <p className="text-[15px] leading-relaxed text-muted-ink">{t('trustText')}</p>
      {p.tests === 0 ? (
        <p className="text-[15px] leading-relaxed">{t('testsNone', { name })}</p>
      ) : (
        <>
          {p.tests < TRUST.minTests && (
            <p className="text-[15px] leading-relaxed">{t('testsFew', { tests: p.tests })}</p>
          )}
          <FactGrid facts={facts} label={t('trustTitle')} />
          {period && <p className="text-meta text-muted-ink">{period}</p>}
          <div>
            <h3 className="text-[15px] font-semibold">{t('extrasTitle')}</h3>
            {extras.length ? (
              <ul className="mt-2 grid gap-1.5 text-[15px]">
                {extras.map((e) => (
                  <li key={e.key} className="flex flex-wrap justify-between gap-x-4">
                    <span>{t(`extras.${e.key}`)}</span>
                    <span className="text-muted-ink tabular-nums">
                      {t('extrasCount', { n: e.n })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-muted-ink">{t('extrasNone')}</p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function GridCard({
  provider: p,
  facts,
  name,
  locale,
}: {
  provider: ProviderFact;
  facts: ProviderFacts;
  name: string;
  locale: Locale;
}) {
  const t = useTranslations('provider');
  const cheapest = percentOf(p.cheapest, p.compared);
  const grid: Fact[] = [
    {
      label: t('gridHotels'),
      value: t('gridHotelsValue', {
        hotels: count(p.hotels, locale),
        total: count(facts.hotels, locale),
      }),
    },
    { label: t('gridNights'), value: count(p.nights, locale) },
  ];
  if (cheapest !== null) {
    grid.push({
      label: t('gridCheapest'),
      value: formatPercent(cheapest / 100, locale),
      hint: t('gridCheapestHint'),
    });
  }
  if (p.median_gap_pct !== null) {
    grid.push({
      label: t('gridGap'),
      value: t('gridGapValue', {
        pct: formatPercent(p.median_gap_pct / 100, locale, { digits: 1 }),
      }),
      hint: t('gridGapHint'),
    });
  }

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="text-h3">{t('gridTitle')}</h2>
      {facts.day && (
        <p className="text-[15px] leading-relaxed text-muted-ink">
          {t('gridText', {
            days: NIGHT_GRID.windowDays,
            date: formatDayMonthYear(facts.day, locale),
          })}
        </p>
      )}
      {p.nights > 0 ? (
        <FactGrid facts={grid} label={t('gridTitle')} />
      ) : (
        <p className="text-[15px] leading-relaxed">{t('gridNone', { name })}</p>
      )}
    </Card>
  );
}

function count(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB').format(n);
}
