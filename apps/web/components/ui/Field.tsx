import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Required: links label, hint and error to the input. */
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

/**
 * Labelled input in a soft box (DESIGN.md §3 Field): small uppercase label on top, bold value.
 * Error: red border plus the message under the box, announced via aria-describedby.
 */
export function TextField({ id, label, hint, error, className, ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        className={cn(
          'flex flex-col gap-0.5 rounded-card border bg-field px-3 py-2.5',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
          error ? 'border-bad' : 'border-line',
        )}
      >
        <label
          htmlFor={id}
          className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase"
        >
          {label}
        </label>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          className="w-full bg-transparent text-[15px] font-bold text-fg outline-none placeholder:font-medium placeholder:text-muted"
          {...input}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="text-meta px-3 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-meta px-3 font-bold text-bad-ink">
          {error}
        </p>
      )}
    </div>
  );
}
