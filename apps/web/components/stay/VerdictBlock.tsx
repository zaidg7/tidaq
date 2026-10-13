import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonth,
  formatPrice,
  relativeChange,
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
  const since =
    stats.daysTracked < 30 && facts.firstDay ? formatDayMonth(facts.firstDay, locale) : undefined;
  const fact =
    stats.state === 'good'
      ? t('good', { k: facts.pricierDays, n: facts.n })
      : stats.state === 'high'
        ? t('high', { k: facts.cheaperDays, n: facts.n })
        : t(stats.state, { n: facts.n });
  const updated = updatedAt ? updatedAtParts(updatedAt, now, locale) : null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <StateChip state={stats.state} daysTracked={stats.daysTracked} className="self-start" />
      <div className="flex flex-col gap-2">
        <VerdictPrice
          cents={stats.nowCents}
          restLine={t('total', {
            perNight: price(Math.round(stats.nowCents / nights)),
            nights,
            adults,
          })}
          scrubbedLine={t('scrubbed', { date: '{date}' })}
          noPriceLine={t('noPrice', { date: '{date}' })}
        />
        {!collecting && delta !== null && <PriceDelta ratio={delta} since={since} />}
      </div>
      {!collecting && stats.lowCents !== null && stats.highCents !== null && (
        <RangeBar
          lowCents={stats.lowCents}
          highCents={stats.highCents}
          nowCents={stats.nowCents}
          days={facts.n}
        />
      )}
      <p className="font-semibold text-fg">{fact}</p>
      {updated && (
        <p className="text-meta -mt-2 text-muted-ink">
          {t(`updated${updated.day}`, { time: updated.time, date: updated.date })} · {t('source')}
        </p>
      )}
    </div>
  );
}
