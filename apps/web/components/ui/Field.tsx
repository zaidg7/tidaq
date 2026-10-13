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
 * Labelled input in a soft box (CRAFT.md §3 TextField): sentence-case label, 16 px value (no iOS
 * zoom), inset focus halo, error row with icon announced via aria-describedby.
 */
export function TextField({ id, label, hint, error, leading, className, ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          'group flex min-h-[60px] items-center gap-3 rounded-card border bg-field px-3.5 py-2.5',
          'transition-[border-color,background-color,box-shadow] duration-[180ms] ease-soft',
          'focus-within:bg-surface',
          error
            ? 'border-bad focus-within:shadow-halo-bad'
            : 'border-line hover:border-line-strong focus-within:border-accent focus-within:shadow-halo',
        )}
      >
        {leading && <span className="text-muted group-focus-within:text-accent">{leading}</span>}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label htmlFor={id} className="text-[12.5px] leading-tight font-semibold text-muted-ink">
            {label}
          </label>
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={cn(hintId, errorId) || undefined}
            className={cn(
              'w-full min-w-0 bg-transparent text-[16px] leading-snug font-bold text-fg',
              'placeholder:font-medium placeholder:text-muted focus:outline-none',
            )}
            {...input}
          />
        </div>
      </div>
      {hint && !error && (
        <p id={hintId} className="text-meta px-3.5 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="flex items-start gap-1.5 px-3.5 text-[13px] font-semibold text-bad-ink"
        >
          <Icon icon={CircleAlert} size={14} className="mt-[2px]" />
          {error}
        </p>
      )}
    </div>
  );
}
