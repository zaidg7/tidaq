import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  icon: LucideIcon;
  /** 14, 16, 18, 20 or 24 px. Stroke 2 at ≤ 16 px, 1.75 above (CRAFT.md §2 Icons). */
  size?: 14 | 16 | 18 | 20 | 24;
  /** Accessible name; without it the icon is decorative and hidden from screen readers. */
  label?: string;
  className?: string;
};

/** Lucide icon in `currentColor` with the Tidaq stroke rules. Import icons one by one. */
export function Icon({ icon: Glyph, size = 20, label, className }: Props) {
  return (
    <Glyph
      size={size}
      strokeWidth={size <= 16 ? 2 : 1.75}
      absoluteStrokeWidth={false}
      className={cn('shrink-0', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  );
}
