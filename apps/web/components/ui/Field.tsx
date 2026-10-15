import type { InputHTMLAttributes, ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Required: links label, hint and error to the input. */
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Icon before the value (an <Icon /> element, 18 px). */
  leading?: ReactNode;
};

/**
 * Labelled input (PREMIUM.md §11 Field): label above (13 px, 600), a 52 px white box with a 12 px
 * radius and a strong hairline, accent ring on focus, `--high` border and an icon row on error,
 * announced via aria-describedby. 16 px value so iOS doesn't zoom.
 */
export function TextField({ id, label, hint, error, leading, className, ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <div
        className={cn(
          'group flex min-h-[52px] items-center gap-3 rounded-input border bg-field px-4',
          'transition-[border-color,box-shadow] duration-[var(--t-fast)] ease-out',
          error
            ? 'border-high focus-within:shadow-halo-bad'
            : 'border-line-strong hover:border-ink/30 focus-within:border-accent focus-within:shadow-halo',
        )}
      >
        {leading && <span className="text-muted group-focus-within:text-accent">{leading}</span>}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          className={cn(
            'w-full min-w-0 bg-transparent py-3 text-[16px] leading-snug text-ink',
            'placeholder:text-faint focus:outline-none',
          )}
          {...input}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-[14px] font-semibold text-high">
          <Icon icon={CircleAlert} size={16} className="mt-[2px]" />
          {error}
        </p>
      )}
    </div>
  );
}
