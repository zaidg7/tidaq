import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Tones (PREMIUM.md §11): soft status fills, plus `drop` (the green "−54 %" badge, white text,
 * AA) and `onPhoto` (credit and "Stadtbild" tags on photos).
 */
export type BadgeTone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'drop' | 'onPhoto';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good',
  bad: 'bg-high-soft text-high',
  warn: 'bg-warn-soft text-warn',
  drop: 'bg-good text-white font-bold tracking-[-0.01em]',
  onPhoto: 'rounded-tag bg-[rgba(21,19,28,0.55)] text-white font-medium',
};

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

/** Small sentence-case label, e.g. "Günstigster", "Partnerlink", "−54 %" or "Stadtbild". */
export function Badge({ tone = 'neutral', className, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold whitespace-nowrap',
        TONES[tone],
        tone === 'onPhoto' && 'h-5 px-2 text-[11px]',
        className,
      )}
      {...rest}
    />
  );
}
