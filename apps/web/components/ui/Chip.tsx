import type { ButtonHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean };

/**
 * Toggle chip (CRAFT.md §3 Chip): 36 px tall with a 44 px hit area; selection shown by colour
 * and a check icon. State is owned by the parent and exposed via aria-pressed.
 */
export function Chip({ pressed, className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        'relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold',
        'before:absolute before:-inset-y-1 before:inset-x-0 before:content-[""]',
        'transition-[background-color,border-color,color] duration-[180ms] ease-soft',
        pressed
          ? 'border-accent bg-accent-soft text-fg'
          : 'border-line bg-surface text-muted-ink hover:border-line-strong hover:text-fg',
        className,
      )}
      {...rest}
    >
      {pressed && <Icon icon={Check} size={14} className="-ml-0.5 text-accent" />}
      {children}
    </button>
  );
}
