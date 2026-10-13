import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonth,
  formatPrice,
  relativeChange,
  STATS,
  updatedAtParts,
  verdictFacts,
  type DailyPrice,
  type Locale,
  type StayStatsResult,
} from '@tidaq/core';
import { PriceDelta } from '@/components/ui/PriceDelta';
import { RangeBar } from '@/components/ui/RangeBar';
import { StateChip } from '@/components/ui/StateChip';
import { cn } from '@/lib/cn';
import { VerdictPrice } from './VerdictPrice';

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
  className?: string;
};

/**
 * The verdict block of the stay panel and the homepage example (CRAFT.md §3), in this order:
 * state chip, XL price with the totals line, delta, range bar, one fact sentence, "Stand".
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
  className,
}: Props) {
  const t = useTranslations('verdict');
  const locale = useLocale() as Locale;
  if (stats.nowCents === null) return null;

  const price = (c: number) => formatPrice(c, locale);
  const facts = verdictFacts(series, today, stats.nowCents);
  const collecting = stats.state === 'collecting';
  const delta = relativeChange(stats.nowCents, stats.avg30Cents);
  // Every fact names its window ("seit 15. Aug."): days with a price, not calendar days.
  const sinceDay = facts.firstDay ? formatDayMonth(facts.firstDay, locale) : '';
  const since = stats.daysTracked < 30 && sinceDay ? sinceDay : undefined;
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
    <div className={cn('flex flex-col gap-4', className)}>
      <StateChip
        state={stats.state}
        daysTracked={stats.daysTracked}
        className="scrub-fade self-start"
      />
      <div className="flex flex-col gap-2">
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
        {!collecting && delta !== null && (
          <PriceDelta ratio={delta} since={since} className="scrub-fade" />
        )}
      </div>
      {!collecting && stats.lowCents !== null && stats.highCents !== null && (
        <RangeBar
          lowCents={stats.lowCents}
          highCents={stats.highCents}
          nowCents={stats.nowCents}
          since={sinceDay}
          className="scrub-fade"
        />
      )}
      {/* "seit 15. Aug." at the end of a sentence must not end in "..". */}
      <p className="scrub-fade font-semibold text-fg">{fact.replace(/\.\.$/, '.')}</p>
      {updated && (
        <p className="scrub-fade text-meta -mt-2 text-muted-ink">
          {t(`updated${updated.day}`, { time: updated.time, date: updated.date })} · {t('source')}
        </p>
      )}
    </div>
  );
}
