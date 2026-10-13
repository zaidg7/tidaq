import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-line text-muted-ink',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good/15 text-good-ink',
  bad: 'bg-bad/15 text-bad-ink',
  warn: 'bg-warn/15 text-warn-ink',
};

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

/** Small label (radius 10), e.g. "Offizielle Seite" or "Anzeige". */
export function Badge({ tone = 'neutral', className, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-badge px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase',
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
