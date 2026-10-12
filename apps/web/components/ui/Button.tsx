import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'ghost';
export type ButtonSize = 'md' | 'lg';

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

/** Pill button styles (DESIGN.md §3 Button). Also for links that look like buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
}: ButtonStyle = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap',
    'transition-[transform,box-shadow,background-color] duration-200 ease-soft',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
    size === 'lg' ? 'px-[22px] py-[13px] text-[15px]' : 'px-[18px] py-[10px] text-[14px]',
    variant === 'primary'
      ? 'bg-accent text-accent-ink hover:-translate-y-0.5 hover:shadow-float'
      : 'border border-line bg-transparent text-fg hover:bg-accent-soft',
    block && 'w-full',
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle;

export function Button({ variant, size, block, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, block }), className)}
      {...rest}
    />
  );
}
