import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean };

/** Toggle chip (DESIGN.md §3 Chip/Toggle). State is owned by the parent; exposed via aria-pressed. */
export function Chip({ pressed, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium',
        'transition-colors duration-150 ease-soft',
        pressed
          ? 'border-accent bg-accent-soft text-fg'
          : 'border-line bg-surface text-muted hover:text-fg',
        className,
      )}
      {...rest}
    />
  );
}
