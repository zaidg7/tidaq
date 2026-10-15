import { cn } from '@/lib/cn';

type Props = {
  /** `md` for the navbar, `lg` for the footer and hero. */
  size?: 'md' | 'lg';
  /** Accessible name. Pass `null` when a wrapping link already names it. */
  label?: string | null;
  /** On dark surfaces and photos: white wordmark and symbol. */
  onDark?: boolean;
  className?: string;
};

/**
 * The Tidaq symbol (PREMIUM.md §5, B-020 option 1 "t-Monogramm"): a soft lowercase t whose stem
 * curves into a dot. 48 × 48 units; strokes, so it stays crisp at 16 px.
 */
export function TidaqSymbol({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M20 7v24a9 9 0 0 0 9 9"
        fill="none"
        stroke={color ?? 'currentColor'}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M11 18h19" stroke={color ?? 'currentColor'} strokeWidth="7" strokeLinecap="round" />
      <circle cx="37.5" cy="40" r="4" fill={color ?? 'currentColor'} />
    </svg>
  );
}

/**
 * Lockup (PREMIUM.md §5): symbol + 8 px + the lowercase wordmark `tidaq` in Instrument Sans 700
 * at −0.04em (Zaid kept the text logo). The symbol is the accent colour on light surfaces.
 */
export function Logo({ size = 'md', label = 'Tidaq', onDark = false, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-2 leading-none font-bold tracking-[-0.04em]',
        size === 'lg' ? 'text-[28px]' : 'text-[23px] lg:text-[25px]',
        onDark ? 'text-white' : 'text-ink',
        className,
      )}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <TidaqSymbol
        className={cn(size === 'lg' ? 'size-[30px]' : 'size-[25px] lg:size-[27px]')}
        color={onDark ? '#ffffff' : 'var(--accent)'}
      />
      <span className="-mt-[0.08em]">tidaq</span>
    </span>
  );
}
