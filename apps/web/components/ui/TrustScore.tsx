import { useTranslations } from 'next-intl';
import { trustLevel, type TrustLevel } from '@tidaq/core';
import { cn } from '@/lib/cn';

const TONES: Record<Exclude<TrustLevel, 'insufficient'>, string> = {
  high: 'bg-good/18 text-good-ink',
  mid: 'bg-line text-muted-ink',
  low: 'bg-bad/18 text-bad-ink',
};

type Props = {
  /** 0–100, null before the first tests. */
  score: number | null;
  /** Checkout tests run for this provider. */
  tests: number;
  /** Tests where the checkout price matched the listed price. */
  matches: number;
  /** Show the sample line ("24 von 25 Tests stimmten") under the score. */
  withSample?: boolean;
  className?: string;
};

/** Trust score box (DESIGN.md §3 TrustScore). Under 5 tests: "Noch zu wenig Tests", never a number. */
export function TrustScore({ score, tests, matches, withSample = true, className }: Props) {
  const t = useTranslations('trust');
  const level = trustLevel(score, tests);
  if (level === 'insufficient' || score === null) {
    return <span className={cn('text-meta text-muted', className)}>{t('insufficient')}</span>;
  }
  const rounded = Math.round(score);
  return (
    <span className={cn('inline-flex flex-col items-start gap-1', className)}>
      <span
        className={cn(
          'min-w-[38px] rounded-badge px-2 py-1 text-center text-[13px] font-extrabold tabular-nums',
          TONES[level],
        )}
      >
        <span aria-hidden="true">{rounded}</span>
        <span className="sr-only">{t('scoreLabel', { score: rounded })}</span>
      </span>
      {withSample && (
        <span className="text-meta text-muted">{t('sample', { matches, tests })}</span>
      )}
    </span>
  );
}
