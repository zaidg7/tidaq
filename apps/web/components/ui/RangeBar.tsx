import { useLocale, useTranslations } from 'next-intl';
import { formatPrice, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  lowCents: number;
  highCents: number;
  nowCents: number;
  /** Days the range covers ("der letzten {n} Tage"). */
  days: number;
  className?: string;
};

/**
 * Where today's price sits between the window's low and high (CRAFT.md §3 Verdict block):
 * an 8 px track tinted good → neutral → bad, a 14 px accent dot at today's price.
 */
export function RangeBar({ lowCents, highCents, nowCents, days, className }: Props) {
  const t = useTranslations('verdict');
  const locale = useLocale() as Locale;
  const price = (c: number) => formatPrice(c, locale);
  const span = highCents - lowCents;
  const f = span > 0 ? Math.max(0, Math.min(1, (nowCents - lowCents) / span)) : 0.5;

  return (
    <div
      role="img"
      aria-label={t('rangeLabel', {
        now: price(nowCents),
        low: price(lowCents),
        high: price(highCents),
        n: days,
      })}
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="bg-range relative h-2 rounded-full">
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-accent shadow-[0_1px_4px_rgba(34,28,59,0.25)]"
          style={{ left: `${f * 100}%` }}
        />
      </div>
      <div
        aria-hidden="true"
        className="text-meta flex justify-between gap-3 text-muted-ink tabular-nums"
      >
        <span>{t('rangeLow', { price: price(lowCents) })}</span>
        <span>{t('rangeHigh', { price: price(highCents) })}</span>
      </div>
    </div>
  );
}
