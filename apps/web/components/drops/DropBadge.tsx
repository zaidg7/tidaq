import { dropTier, formatDrop, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

/**
 * The drop badge on a photo (PREMIUM.md §11): "−70 %", louder the bigger the drop (core
 * `dropTier`): 60 % and more bright mint, 40 % to 59 % deep green, smaller drops white with green
 * text. The visible text is the number; `label` is the full sentence for screen readers.
 */
export function DropBadge({
  drop,
  locale,
  label,
  size = 'md',
  className,
}: {
  drop: number;
  locale: Locale;
  /** "Preis um −70 % gefallen". */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      className={cn(
        `drop-badge-${dropTier(drop)}`,
        'inline-flex items-center rounded-full leading-none font-bold tracking-[-0.01em] tabular-nums',
        size === 'sm' && 'h-7 px-2.5 text-[15px]',
        size === 'md' && 'h-8 px-3 text-[16px]',
        size === 'lg' && 'h-10 px-4 text-[20px]',
        className,
      )}
    >
      <span aria-hidden="true">{formatDrop(drop, locale)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
