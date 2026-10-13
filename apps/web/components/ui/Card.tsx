import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** `float`: two-layer violet shadow (search card, stay panel). `flat`: 1 px border only. */
  variant?: 'flat' | 'float';
  /** `search`: the larger 26 px radius of the search card. */
  radius?: 'card' | 'search';
  /** Lifts 2 px with a stronger shadow on hover (cards that are links). */
  interactive?: boolean;
};

/** White surface (CRAFT.md §3 Card). Shadows only where it floats or reacts. */
export function Card({
  variant = 'flat',
  radius = 'card',
  interactive = false,
  className,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'bg-surface',
        radius === 'search' ? 'rounded-search' : 'rounded-card',
        variant === 'float' ? 'border border-accent/10 shadow-float' : 'border border-line',
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-[180ms] ease-soft hover:-translate-y-0.5 hover:border-line-strong hover:shadow-hover',
        className,
      )}
      {...rest}
    />
  );
}
