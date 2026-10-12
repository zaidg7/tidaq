import { useTranslations } from 'next-intl';
import { STATS, type StayState } from '@tidaq/core';
import { cn } from '@/lib/cn';

const TONES: Record<StayState, string> = {
  near_low: 'bg-good/15 text-good-ink',
  good: 'bg-good/15 text-good-ink',
  normal: 'bg-line text-muted-ink',
  high: 'bg-bad/15 text-bad-ink',
  collecting: 'bg-warn/15 text-warn-ink',
};

type Props = {
  state: StayState;
  /** Days with data, shown while collecting ("3/7"). */
  daysTracked?: number;
  className?: string;
};

/** Price state pill (DESIGN.md §3 StateChip). */
export function StateChip({ state, daysTracked = 0, className }: Props) {
  const t = useTranslations('state');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-[11px] py-[5px] text-[12px] font-bold whitespace-nowrap',
        TONES[state],
        className,
      )}
    >
      {t(state, { days: Math.min(daysTracked, STATS.minDays), needed: STATS.minDays })}
    </span>
  );
}
