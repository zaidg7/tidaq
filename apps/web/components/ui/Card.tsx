import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** `float`: soft violet shadow (search card, stay panel). `flat`: 1 px border only. */
  variant?: 'flat' | 'float';
  /** `search`: the larger 26 px radius of the search card. */
  radius?: 'card' | 'search';
};

/** White surface (DESIGN.md §2: radius 18, shadow only where it floats). */
export function Card({ variant = 'flat', radius = 'card', className, ...rest }: Props) {
  return (
    <div
      className={cn(
        'border border-line bg-surface p-[18px]',
        radius === 'search' ? 'rounded-search' : 'rounded-card',
        variant === 'float' && 'shadow-float',
        className,
      )}
      {...rest}
    />
  );
}
