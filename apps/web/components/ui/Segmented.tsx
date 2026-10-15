'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  /** Accessible name of the group, e.g. "Zeitraum". */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * Segmented control (PREMIUM.md §11): equal segments on a `--surface-2` track, a white thumb
 * that slides to the chosen one (200 ms). A radio group for assistive tech: arrows move and
 * select, Home/End jump, only the chosen segment is in the tab order.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const move = (to: number) => {
    const next = (to + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    };
    const to = moves[e.key];
    if (to === undefined) return;
    e.preventDefault();
    move(to);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cn(
        'relative grid h-10 rounded-full bg-surface-2 p-1 text-[14px] font-semibold',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-surface shadow-1 transition-transform duration-[var(--t-base)] ease-out"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-10 rounded-full px-3 whitespace-nowrap transition-colors duration-[var(--t-base)]',
            i === index ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
