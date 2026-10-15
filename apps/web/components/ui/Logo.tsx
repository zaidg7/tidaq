import { cn } from '@/lib/cn';

type Props = {
  /** `md` for the navbar (26 px), `lg` for the footer (24 px is used there via md), `lg` = 28 px. */
  size?: 'md' | 'lg';
  /** Accessible name. Pass `null` when a wrapping link already names it. */
  label?: string | null;
  /** On dark surfaces: white. Otherwise it inherits the text colour (ink, or white on a photo). */
  onDark?: boolean;
  className?: string;
};

/**
 * The wordmark (PREMIUM.md §5, mockup B): lowercase `tidaq` in Instrument Sans 700 at −0.04em,
 * nothing next to it. The app icon is the same "t", black on white (`app/icon.svg`).
 */
export function Logo({ size = 'md', label = 'Tidaq', onDark = false, className }: Props) {
  return (
    <span
      className={cn(
        'logo inline-flex shrink-0 items-center leading-none font-bold tracking-[-0.04em]',
        size === 'lg' ? 'text-[28px]' : 'text-[24px] lg:text-[26px]',
        onDark && 'text-white',
        className,
      )}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      tidaq
    </span>
  );
}
