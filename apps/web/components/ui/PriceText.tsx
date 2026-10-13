import { priceParts, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

export type PriceSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  cents: number;
  locale: Locale;
  /** `xl`: the stay price (CRAFT.md "Price XL"). */
  size?: PriceSize;
  className?: string;
};

const SIZES: Record<PriceSize, string> = {
  sm: 'text-[13px] font-bold tabular-nums',
  md: 'text-[16px] font-extrabold tabular-nums tracking-[-0.01em]',
  lg: 'text-[22px] font-extrabold tracking-[-0.03em]',
  xl: 'text-price-xl',
};

/**
 * Typeset EUR price (D-21, CRAFT.md §2): `1.184 €` / `€1,184`. Large sizes get a small, lighter
 * € and proportional digits. A no-break space keeps amount and € together: narrow (U+202F)
 * next to the small € of large sizes, a normal one (U+00A0) at text sizes.
 * No hooks and no i18n runtime: safe in client components (pass the locale).
 */
export function PriceText({ cents, locale, size = 'md', className }: Props) {
  const { amount, currencyFirst } = priceParts(cents, locale);
  const large = size === 'lg' || size === 'xl';
  const euro = (
    <span className={large ? 'text-[0.58em] font-bold tracking-normal text-muted' : undefined}>
      €
    </span>
  );
  return (
    <span className={cn('whitespace-nowrap', SIZES[size], className)}>
      {currencyFirst ? (
        <>
          {euro}
          {amount}
        </>
      ) : (
        <>
          {amount}
          {large ? '\u202f' : '\u00a0'}
          {euro}
        </>
      )}
    </span>
  );
}
