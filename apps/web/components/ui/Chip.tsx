import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean };

/**
 * Filter chip (PREMIUM.md §11): 40 px pill with a 44 px hit area. Selected = ink fill with white
 * text, so it reads at a glance; on and off have the same width, so a row never reflows on tap.
 * State is owned by the parent and exposed via aria-pressed.
 */
export function Chip({ pressed, className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={chipClasses(pressed, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function chipClasses(selected: boolean, className?: string) {
  return cn(
    'relative inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold whitespace-nowrap',
    'before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[""]',
    'transition-[background-color,border-color,color,transform] duration-[var(--t-fast)] ease-out active:scale-[0.97]',
    selected
      ? 'border-ink bg-ink text-white'
      : 'border-line-strong bg-surface text-ink-2 hover:border-ink/40 hover:text-ink',
    className,
  );
}

/**
 * The same chip as a link, for filters that are URLs: works without JavaScript, the selected
 * one carries aria-current.
 */
export function ChipLink({
  selected,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { selected: boolean }) {
  return (
    <a
      aria-current={selected ? 'page' : undefined}
      className={chipClasses(selected, className)}
      {...rest}
    >
      {children}
    </a>
  );
}
