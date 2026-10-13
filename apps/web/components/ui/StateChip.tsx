import { useTranslations } from 'next-intl';
import { STATS, type StayState } from '@tidaq/core';
import { cn } from '@/lib/cn';

const TONES: Record<StayState, { chip: string; dot: string }> = {
  near_low: { chip: 'bg-good-soft text-good-ink', dot: 'bg-good' },
  good: { chip: 'bg-good-soft text-good-ink', dot: 'bg-good' },
  normal: { chip: 'bg-neutral-soft text-muted-ink', dot: 'bg-muted' },
  high: { chip: 'bg-bad-soft text-bad-ink', dot: 'bg-bad' },
  collecting: { chip: 'bg-warn-soft text-warn-ink', dot: 'bg-warn' },
};

/** 12 px ring that fills with the collected days (3/7), no animation (CRAFT.md §3 StateChip). */
function ProgressRing({ value }: { value: number }) {
  const r = 4.5;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0 -rotate-90" aria-hidden="true">
      <circle
        cx="6"
        cy="6"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <circle
        cx="6"
        cy="6"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
      />
    </svg>
  );
}

type Props = {
  state: StayState;
  /** Days with data, shown while collecting ("3/7"). */
  daysTracked?: number;
  /** `sm` for the sticky bar and lists. */
  size?: 'sm' | 'md';
  className?: string;
};

/** Price state pill with a coloured dot, or a progress ring while collecting. */
export function StateChip({ state, daysTracked = 0, size = 'md', className }: Props) {
  const t = useTranslations('state');
  const days = Math.max(0, Math.min(daysTracked, STATS.minDays));
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[12.5px]',
        TONES[state].chip,
        className,
      )}
    >
      {state === 'collecting' ? (
        <ProgressRing value={days / STATS.minDays} />
      ) : (
        <span
          className={cn('size-1.5 shrink-0 rounded-full', TONES[state].dot)}
          aria-hidden="true"
        />
      )}
      {t(state, { days, needed: STATS.minDays })}
    </span>
  );
}
