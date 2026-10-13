import { useLocale, useTranslations } from 'next-intl';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercent } from '@tidaq/core';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = {
  /** Relative change vs. the average, e.g. −0.05 (see `relativeChange` in core). */
  ratio: number;
  /** With fewer than 30 days of data: the first day ("14. Okt."), shown as "seit …". */
  since?: string;
  className?: string;
};

/** Within ±2 % the delta reads "etwa im Schnitt": smaller moves are noise for a hotel total. */
const SAME = 0.02;

/**
 * "−5 % unter dem 30-Tage-Schnitt" with a trend icon (CRAFT.md §3 PriceDelta). Falling is
 * green, rising red (D-22); the icon keeps the meaning without colour.
 */
export function PriceDelta({ ratio, since, className }: Props) {
  const t = useTranslations('priceDelta');
  const locale = useLocale();
  if (Math.abs(ratio) < SAME) {
    return (
      <p className={cn('text-meta flex items-center gap-1.5 text-muted-ink', className)}>
        <Icon icon={Minus} size={14} />
        {since ? t('sameSince', { since }) : t('same')}
      </p>
    );
  }
  const below = ratio < 0;
  const percent = formatPercent(ratio, locale, { signed: true }).replace('-', '−');
  const key = below ? (since ? 'belowSince' : 'below') : since ? 'aboveSince' : 'above';
  return (
    <p
      className={cn(
        'text-meta flex items-center gap-1.5 tabular-nums',
        below ? 'text-good-ink' : 'text-bad-ink',
        className,
      )}
    >
      <Icon icon={below ? TrendingDown : TrendingUp} size={14} />
      <span>
        {t.rich(key, {
          percent,
          since: since ?? '',
          b: (chunks) => <b className="font-bold">{chunks}</b>,
        })}
      </span>
    </p>
  );
}
