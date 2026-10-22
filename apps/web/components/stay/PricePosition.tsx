import { useLocale, useTranslations } from 'next-intl';
import { formatPrice, quantile, type DailyPrice, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  /** Today's price and the prices of the window it is compared with (oldest first). */
  nowCents: number;
  series: readonly DailyPrice[];
  /** Colour of today's marker: the verdict (green when cheap, red when dear). */
  tone: 'good' | 'normal' | 'high';
  className?: string;
};

const TONE = {
  good: { dot: 'bg-good', text: 'text-good-ink' },
  normal: { dot: 'bg-ink', text: 'text-ink' },
  high: { dot: 'bg-bad', text: 'text-bad-ink' },
} as const;

const pct = (f: number) => `${Math.round(Math.min(1, Math.max(0, f)) * 1000) / 10}%`;

/**
 * Where today's price sits (C-179, mockup A): one track from the lowest to the highest price of
 * the window, the usual range (middle half of the days) as a darker band, today as a dot. Facts
 * only: the labels name the numbers the track is drawn from.
 */
export function PricePosition({ nowCents, series, tone, className }: Props) {
  const t = useTranslations('verdict');
  const locale = useLocale() as Locale;
  const values = series.map((p) => p.bestCents);
  if (values.length < 2) return null;
  const min = Math.min(nowCents, ...values);
  const max = Math.max(nowCents, ...values);
  if (max <= min) return null;
  const q1 = Math.round(quantile(values, 0.25) as number);
  const q3 = Math.round(quantile(values, 0.75) as number);
  const at = (c: number) => (c - min) / (max - min);
  const price = (c: number) => formatPrice(c, locale);
  const label = t('positionLabel', {
    now: price(nowCents),
    low: price(q1),
    high: price(q3),
    min: price(min),
    max: price(max),
    days: values.length,
  });

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div role="img" aria-label={label} className="relative h-2 rounded-full bg-neutral-soft">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full bg-line-strong"
          style={{ left: pct(at(q1)), width: pct(at(q3) - at(q1)) }}
        />
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-surface',
            TONE[tone].dot,
          )}
          style={{ left: `clamp(8px, ${pct(at(nowCents))}, calc(100% - 8px))` }}
        />
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between gap-2 text-[12px] text-muted-ink tabular-nums"
      >
        <span className={cn('font-semibold', TONE[tone].text)}>
          {t('positionToday', { price: price(nowCents) })}
        </span>
        <span>{t('positionUsual', { low: price(q1), high: price(q3) })}</span>
        <span>{t('positionHigh', { price: price(max) })}</span>
      </div>
    </div>
  );
}
