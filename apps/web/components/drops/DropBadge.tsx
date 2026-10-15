import { dropTier, formatDrop, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

/** Text colour of a drop ("−31 %", "1.525 € weniger"): the badge's red step (D-46). */
export function dropTextClass(drop: number): string {
  return `drop-text-${dropTier(drop)}`;
}

/**
 * The drop badge on a photo (PREMIUM.md §11): "−70 %", the stronger red the bigger the drop (core
 * `dropTier`, D-46): 60 % and more bright red with a glow, 40 % to 59 % solid red, 20 % to 39 %
 * light red, smaller drops white with red text. The visible text is the number; `label` is the
 * full sentence for screen readers.
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
