import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'ghost' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[14px] gap-2',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-[52px] px-6 text-[16px] gap-2.5',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-accent-gradient text-accent-ink',
    'hover:-translate-y-px hover:bg-none hover:bg-accent-hover hover:shadow-button',
    'active:translate-y-0 active:scale-[0.98] active:bg-none active:bg-accent-press active:shadow-none',
  ),
  ghost: cn(
    'border border-line bg-surface text-fg',
    'hover:border-line-strong hover:bg-surface-2 active:bg-accent-soft',
  ),
  subtle: 'bg-transparent text-accent hover:bg-accent-soft active:bg-accent-soft',
};

/** Pill button styles (CRAFT.md §3 Button). Also for links that look like buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
}: ButtonStyle = {}) {
  return cn(
    'relative inline-flex select-none items-center justify-center rounded-full font-semibold',
    'tracking-[-0.005em] whitespace-nowrap',
    'transition-[transform,box-shadow,background-color,border-color,color] duration-[180ms] ease-soft',
    SIZES[size],
    VARIANTS[variant],
    // Disabled: neutral, not a lighter brand colour (CRAFT.md §3).
    'disabled:pointer-events-none disabled:border-transparent disabled:bg-none disabled:bg-line',
    'disabled:text-disabled-ink disabled:shadow-none',
    'aria-disabled:pointer-events-none aria-disabled:bg-none aria-disabled:bg-line',
    'aria-disabled:text-disabled-ink aria-disabled:shadow-none',
    block && 'w-full',
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyle & {
    /** Shows a spinner, keeps the width, blocks clicks and sets aria-busy. */
    loading?: boolean;
    /** Icon before the label (an <Icon /> element). */
    leading?: ReactNode;
  };

export function Button({
  variant,
  size,
  block,
  loading = false,
  leading,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses({ variant, size, block }),
        loading && 'pointer-events-none',
        className,
      )}
      {...rest}
    >
      <span className={cn('inline-flex items-center gap-[inherit]', loading && 'opacity-0')}>
        {leading}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Icon icon={LoaderCircle} size={size === 'lg' ? 20 : 16} className="animate-spin" />
        </span>
      )}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible name (required: the button has no visible text). */
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'subtle';
};

/** 44 px round icon button (menu, search, close). */
export function IconButton({
  label,
  children,
  variant = 'subtle',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-grid size-11 shrink-0 place-items-center rounded-full text-fg',
        'transition-colors duration-[180ms] ease-soft',
        variant === 'ghost'
          ? 'border border-line bg-surface hover:border-line-strong hover:bg-surface-2'
          : 'hover:bg-accent-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
