import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** `float`: border + soft neutral shadow (panels that sit above the page). `flat`: 1 px border only. */
  variant?: 'flat' | 'float';
  /** `search`: the larger 28 px panel radius. */
  radius?: 'card' | 'search';
  /**
   * Lifts 4 px with a stronger shadow on hover (cards that are links, PREMIUM.md §6). A link inside puts the
   * focus ring on the whole card; give it `after:absolute after:inset-0` to stretch its hit area.
   */
  interactive?: boolean;
  /** Padding 20 mobile / 24 desktop. `false` for media cards that pad their own body. */
  padded?: boolean;
};

/** White surface (PREMIUM.md §3.3). Shadows only where it floats or reacts. */
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
        variant === 'float'
          ? 'border border-[#ece9f1] shadow-[0_16px_40px_rgba(21,19,28,0.06)]'
          : 'border border-line',
        interactive &&
          cn(
            'transition-[transform,box-shadow,border-color] duration-[var(--t-base)] ease-out',
            'hover:-translate-y-1 hover:border-line-strong hover:shadow-2 active:scale-[0.99] motion-reduce:hover:translate-y-0',
            'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent',
            '[&_a:focus-visible]:outline-none',
          ),
        className,
      )}
      {...rest}
    />
  );
}
