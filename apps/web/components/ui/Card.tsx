import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** `float`: two-layer violet shadow (search card, stay panel). `flat`: 1 px border only. */
  variant?: 'flat' | 'float';
  /** `search`: the larger 26 px radius of the search card. */
  radius?: 'card' | 'search';
  /**
   * Lifts 2 px with a stronger shadow on hover (cards that are links). A link inside puts the
   * focus ring on the whole card; give it `after:absolute after:inset-0` to stretch its hit area.
   */
  interactive?: boolean;
  /** Padding 20 mobile / 24 desktop. `false` for media cards that pad their own body. */
  padded?: boolean;
};

/** White surface (CRAFT.md §3 Card). Shadows only where it floats or reacts. */
export function Card({
  variant = 'flat',
  radius = 'card',
  interactive = false,
  padded = true,
  className,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'relative bg-surface [overflow-wrap:anywhere]',
        padded && 'p-5 lg:p-6',
        radius === 'search' ? 'rounded-search' : 'rounded-card',
        variant === 'float' ? 'border border-accent/10 shadow-float' : 'border border-line',
        interactive &&
          cn(
            'transition-[transform,box-shadow,border-color] duration-[180ms] ease-soft',
            'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-hover motion-reduce:hover:translate-y-0',
            'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent',
            '[&_a:focus-visible]:outline-none',
          ),
        className,
      )}
      {...rest}
    />
  );
}
