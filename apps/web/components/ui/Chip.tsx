import type { ButtonHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean };

/**
 * Toggle chip (CRAFT.md §3 Chip): 36 px tall with a 44 px hit area; selection shown by colour
 * and a check icon. On and off have the same width (icon + gap = the extra padding), so a row
 * never reflows on tap. State is owned by the parent and exposed via aria-pressed.
 */
export function Chip({ pressed, className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        'relative inline-flex h-9 items-center gap-1 rounded-full border text-[13.5px] font-semibold whitespace-nowrap',
        'before:absolute before:-inset-y-1 before:inset-x-0 before:content-[""]',
        'transition-[background-color,border-color,color] duration-[180ms] ease-soft',
        pressed
          ? 'border-accent bg-accent-soft pr-3.5 pl-2 text-fg'
          : 'border-line bg-surface px-5 text-muted-ink hover:border-line-strong hover:text-fg',
        className,
      )}
      {...rest}
    >
      {pressed && <Icon icon={Check} size={14} className="text-accent" />}
      {children}
    </button>
  );
}
