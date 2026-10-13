import { useLocale, useTranslations } from 'next-intl';
import { formatPercent } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  /** Relative change vs. the 30-day average, e.g. −0.05 (see `relativeChange` in core). */
  ratio: number;
  className?: string;
};

/** Below 0.5 % the delta rounds to 0 % and is shown as "at the average". */
const SAME = 0.005;

/** "▼ 5 % unter dem 30-Tage-Schnitt" in green, "▲ 4 % über …" in red (DESIGN.md §3 PriceDelta). */
export function PriceDelta({ ratio, className }: Props) {
  const t = useTranslations('priceDelta');
  const locale = useLocale();
  const percent = formatPercent(Math.abs(ratio), locale);
  if (Math.abs(ratio) < SAME) {
    return <p className={cn('text-meta text-muted', className)}>{t('same')}</p>;
  }
  const below = ratio < 0;
  return (
    <p
      className={cn(
        'text-meta font-bold tabular-nums',
        below ? 'text-good-ink' : 'text-bad-ink',
        className,
      )}
    >
      <span aria-hidden="true">{below ? '▼ ' : '▲ '}</span>
      {t(below ? 'below' : 'above', { percent })}
    </p>
  );
}
