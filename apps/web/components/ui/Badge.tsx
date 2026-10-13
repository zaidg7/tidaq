import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-soft text-muted-ink',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good-ink',
  bad: 'bg-bad-soft text-bad-ink',
  warn: 'bg-warn-soft text-warn-ink',
};

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

/** Small sentence-case label (CRAFT.md §3 Badge), e.g. "Günstigster" or "Partnerlink". */
export function Badge({ tone = 'neutral', className, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-chip-sm px-2 text-[12px] font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
