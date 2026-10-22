import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  addDays,
  formatDayMonth,
  formatPrice,
  STATS,
  updatedAtParts,
  verdictFacts,
  type DailyPrice,
  type Locale,
  type StayStatsResult,
} from '@tidaq/core';
import { PricePosition } from './PricePosition';
import { StateChip } from '@/components/ui/StateChip';
import { cn } from '@/lib/cn';
import { VerdictPrice } from './VerdictPrice';

/** Days the price track compares today with (the chart's default range). */
const POSITION_DAYS = 30;

type Props = {
  stats: StayStatsResult;
  series: readonly DailyPrice[];
  /** `YYYY-MM-DD` in German time. */
  today: string;
  nights: number;
  adults: number;
  /** When the prices were collected (ISO); null hides the "Stand" line. */
  updatedAt: string | null;
  /** For tests and the dev page; defaults to the request time. */
  now?: Date;
  /** The main button (C-174: "Bei Trip.com buchen · 1.184 €"), between the sentence and "Stand". */
  action?: ReactNode;
  /** Appended to the "Stand" line, e.g. "Partnerlink" under a partner button. */
  updatedNote?: string;
  className?: string;
};

/**
 * The verdict block of the stay panel (CRAFT.md §3, C-174 blueprint), in this order: state chip,
 * XL price with the per-night line, one fact sentence, the main button, "Stand". The verdict is
 * said once: no delta, meter or advice box next to the chip and the sentence.
 * Every sentence is about the past, never a forecast.
 */
export function VerdictBlock({
  stats,
  series,
  today,
  nights,
  adults,
  updatedAt,
  now = new Date(),
  action,
  updatedNote,
  className,
}: Props) {
  const t = useTranslations('verdict');
  const locale = useLocale() as Locale;
  if (stats.nowCents === null) return null;

  const price = (c: number) => formatPrice(c, locale);
  const facts = verdictFacts(series, today, stats.nowCents);
  // Every fact names its window ("seit 15. Aug."): days with a price, not calendar days.
  const sinceDay = facts.firstDay ? formatDayMonth(facts.firstDay, locale) : '';
  const fact =
    stats.state === 'good'
      ? t('good', { k: facts.pricierDays, n: facts.n, since: sinceDay })
      : stats.state === 'high'
        ? t('high', { k: facts.cheaperDays, n: facts.n, since: sinceDay })
        : stats.state === 'collecting'
          ? t('collecting', { missing: Math.max(1, STATS.minDays - facts.n) })
          : t(stats.state, { since: sinceDay });
  const updated = updatedAt ? updatedAtParts(updatedAt, now, locale) : null;

  // Parts that describe today fade while the chart is scrubbed (`.scrub-fade`, globals.css).
  return (
    <div className={cn('flex flex-col gap-3 md:gap-4', className)}>
      <StateChip
        state={stats.state}
        daysTracked={stats.daysTracked}
        className="scrub-fade self-start"
      />
      <VerdictPrice
        cents={stats.nowCents}
        locale={locale}
        restLine={[
          t('totalPrice', { perNight: price(Math.round(stats.nowCents / nights)) }),
          t('totalStay', { nights, adults }),
        ]}
        scrubbedLine={t('scrubbed', { date: '{date}' })}
        noPriceLine={t('noPrice', { date: '{date}' })}
      />
      {stats.state === 'collecting' ? (
        // "seit 15. Aug." at the end of a sentence must not end in "..".
        <p className="scrub-fade font-semibold text-fg">{fact.replace(/\.\.$/, '.')}</p>
      ) : (
        // With a verdict, the track says it (C-179): today between low, usual and high.
        <PricePosition
          className="scrub-fade"
          nowCents={stats.nowCents}
          series={series.filter((p) => p.day > addDays(today, -POSITION_DAYS))}
          tone={
            stats.state === 'good' || stats.state === 'near_low'
              ? 'good'
              : stats.state === 'high'
                ? 'high'
                : 'normal'
          }
        />
      )}
      {action}
      {updated && (
        <p className={cn('scrub-fade text-meta text-muted-ink', !action && '-mt-2')}>
          {t(`updated${updated.day}`, { time: updated.time, date: updated.date })} ·{' '}
          {updatedNote ?? t('source')}
        </p>
      )}
    </div>
  );
}
