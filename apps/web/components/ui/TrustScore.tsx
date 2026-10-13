import { useTranslations } from 'next-intl';
import { trustLevel, type TrustLevel } from '@tidaq/core';
import { cn } from '@/lib/cn';

const TONES: Record<Exclude<TrustLevel, 'insufficient'>, { box: string; bar: string }> = {
  high: { box: 'bg-good-soft text-good-ink', bar: 'bg-good' },
  mid: { box: 'bg-neutral-soft text-muted-ink', bar: 'bg-muted' },
  low: { box: 'bg-bad-soft text-bad-ink', bar: 'bg-bad' },
};

type Props = {
  /** 0–100, null before the first tests. */
  score: number | null;
  /** Checkout tests run for this provider. */
  tests: number;
  /** Tests where the checkout price was the same or lower. */
  matches: number;
  /** Show the sample line ("24 von 25 Tests stimmten") under the score. */
  withSample?: boolean;
  className?: string;
};

/**
 * "Preistreue" score (CRAFT.md §3 TrustScore): number, /100 and a small bar, with the sample line.
 * Under 5 tests never a number: a dashed box with the test count.
 */
export function TrustScore({ score, tests, matches, withSample = true, className }: Props) {
  const t = useTranslations('trust');
  const level = trustLevel(score, tests);
  if (level === 'insufficient' || score === null) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <span
          aria-hidden="true"
          className="grid h-7 min-w-9 place-items-center rounded-badge border border-dashed border-line-strong px-2 text-[14px] font-extrabold text-muted"
        >
          –
        </span>
        <span className="text-[12.5px] text-muted-ink">
          {tests > 0 ? t('insufficient', { tests }) : t('untested')}
        </span>
      </span>
    );
  }
  const rounded = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <span className={cn('inline-flex flex-col items-start gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex flex-col gap-1 rounded-badge px-2 pt-1 pb-1.5',
          TONES[level].box,
        )}
      >
        <span className="flex items-baseline gap-0.5 tabular-nums" aria-hidden="true">
          <span className="text-[14px] leading-none font-extrabold">{rounded}</span>
          <span className="text-[11px] leading-none font-semibold opacity-70">/100</span>
        </span>
        <span className="h-[3px] w-9 overflow-hidden rounded-full bg-current/20" aria-hidden="true">
          <span
            className={cn('block h-full rounded-full', TONES[level].bar)}
            style={{ width: `${rounded}%` }}
          />
        </span>
        <span className="sr-only">{t('scoreLabel', { score: rounded })}</span>
      </span>
      {withSample && (
        <span className="text-[12.5px] text-muted-ink">{t('sample', { matches, tests })}</span>
      )}
    </span>
  );
}
