import { cn } from '@/lib/cn';

type Props = { size?: 'md' | 'lg'; className?: string };

/** Wordmark `tidaq` (DESIGN.md §3 Logo): lowercase, 800, tight tracking. Wrap in a link where needed. */
export function Logo({ size = 'md', className }: Props) {
  return (
    <span
      className={cn(
        'font-extrabold tracking-[-0.04em] text-fg',
        size === 'lg' ? 'text-[32px]' : 'text-[22px]',
        className,
      )}
    >
      tidaq
    </span>
  );
}
