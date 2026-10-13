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
 * "Preistreue" score (CRAFT.md §3 TrustScore): a 28 px box with number, /100 and a small bar,
 * the sample line below. Under 5 tests never a number: the same box dashed with "–", and the
 * test count below. Both states share one geometry so provider-table columns line up.
 */
export function TrustScore({ score, tests, matches, withSample = true, className }: Props) {
  const t = useTranslations('trust');
  const level = trustLevel(score, tests);
  const insufficient = level === 'insufficient' || score === null;
  const rounded = insufficient ? 0 : Math.max(0, Math.min(100, Math.round(score)));
  const note = insufficient
    ? tests > 0
      ? t('insufficient', { tests })
      : t('untested')
    : withSample
      ? t('sample', { matches, tests })
      : null;
  return (
    <span className={cn('inline-flex max-w-[132px] flex-col items-start gap-1', className)}>
      {insufficient ? (
        <span
          aria-hidden="true"
          className="grid h-7 w-11 place-items-center rounded-badge border border-dashed border-line-strong text-[14px] font-extrabold text-muted"
        >
          –
        </span>
      ) : (
        <span
          className={cn(
            'inline-flex h-7 items-center gap-2 rounded-badge px-2 tabular-nums',
            TONES[level as Exclude<TrustLevel, 'insufficient'>].box,
          )}
        >
          <span className="flex items-baseline gap-px" aria-hidden="true">
            <span className="text-[14px] leading-none font-extrabold">{rounded}</span>
            <span className="text-[11px] leading-none font-semibold">/100</span>
          </span>
          <span
            className="h-[3px] w-9 overflow-hidden rounded-full bg-current/15"
            aria-hidden="true"
          >
            <span
              className={cn(
                'block h-full rounded-full',
                TONES[level as Exclude<TrustLevel, 'insufficient'>].bar,
              )}
              style={{ width: `${rounded}%` }}
            />
          </span>
          <span className="sr-only">{t('scoreLabel', { score: rounded })}</span>
        </span>
      )}
      {note && <span className="text-[12.5px] leading-snug text-muted-ink">{note}</span>}
    </span>
  );
}
