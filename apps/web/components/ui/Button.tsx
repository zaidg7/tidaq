import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/**
 * Button variants (PREMIUM.md §11):
 * - `primary`: the one action of a block, accent fill.
 * - `secondary`: white with a border. `ghost` is its old name and still means the same.
 * - `subtle`: text only in the accent colour (small actions like "Zurücksetzen").
 * - `onPhoto`: frosted white for buttons that sit on photos.
 * - `dark`: ink fill, for actions on light accent panels.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'onPhoto' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-4 text-[15px] gap-2 rounded-[14px]',
  md: 'h-[52px] px-6 text-[16px] gap-2 rounded-button',
  lg: 'h-[60px] px-7 text-[17px] gap-2.5 rounded-button',
};

const SECONDARY = cn(
  'border border-line-strong bg-surface text-ink',
  'hover:border-ink/30 hover:bg-surface-2 active:bg-surface-2',
);

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover active:bg-accent-press',
  secondary: SECONDARY,
  ghost: SECONDARY,
  subtle: 'bg-transparent text-accent hover:bg-accent-soft active:bg-accent-soft',
  onPhoto: 'bg-white/90 text-ink backdrop-blur-md hover:bg-white',
  dark: 'bg-ink text-white hover:bg-ink-2',
};

/** Button styles (PREMIUM.md §11). Also for links that look like buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
}: ButtonStyle = {}) {
  return cn(
    'relative inline-flex select-none items-center justify-center font-semibold',
    'whitespace-nowrap',
    'transition-[transform,background-color,border-color,color] duration-[var(--t-fast)] ease-out',
    'active:scale-[0.98] motion-reduce:active:scale-100',
    SIZES[size],
    VARIANTS[variant],
    // Disabled: neutral and quiet, not a lighter brand colour.
    'disabled:pointer-events-none disabled:opacity-40',
    'aria-disabled:pointer-events-none aria-disabled:opacity-40',
    block && 'w-full',
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyle & {
    /** Shows a spinner instead of the label, keeps the width, blocks clicks, sets aria-busy. */
    loading?: boolean;
    /** Icon before the label (an <Icon /> element). */
    leading?: ReactNode;
    /** Content after the label, e.g. a price ("1.139 € →"); pushed to the right edge in `block`. */
    trailing?: ReactNode;
  };

export function Button({
  variant,
  size,
  block,
  loading = false,
  leading,
  trailing,
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
        block && trailing ? 'justify-between' : undefined,
        loading && 'pointer-events-none',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-flex items-center gap-[inherit] transition-opacity duration-[var(--t-fast)]',
          loading && 'opacity-0',
        )}
      >
        {leading}
        {children}
      </span>
      {trailing && (
        <span className={cn('inline-flex items-center gap-1.5', loading && 'opacity-0')}>
          {trailing}
        </span>
      )}
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Icon icon={LoaderCircle} size={size === 'lg' ? 24 : 18} className="animate-spin" />
        </span>
      )}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible name (required: the button has no visible text). */
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'subtle' | 'onPhoto';
  /** React 19: a plain prop, passed through to the <button>. */
  ref?: Ref<HTMLButtonElement>;
};

/** 44 px round icon button (menu, search, close, back, share). */
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
        'inline-grid size-11 shrink-0 place-items-center rounded-full text-ink',
        'transition-[background-color,transform] duration-[var(--t-fast)] ease-out active:scale-95',
        variant === 'ghost'
          ? 'border border-line-strong bg-surface hover:bg-surface-2'
          : variant === 'onPhoto'
            ? 'bg-white/90 shadow-1 backdrop-blur-md hover:bg-white'
            : 'hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
