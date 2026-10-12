import { useLocale } from 'next-intl';
import { formatPrice } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  cents: number;
  /** `xl`: the big stay price (DESIGN.md "Price XL"). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const SIZES = {
  sm: 'text-[13px] font-bold',
  md: 'text-[15px] font-extrabold',
  lg: 'text-[20px] font-extrabold',
  xl: 'text-price-xl',
} as const;

/** Formatted EUR price with tabular digits: `1.184 €` (de), `€1,184` (en). */
export function Price({ cents, size = 'md', className }: Props) {
  const locale = useLocale();
  return (
    <span className={cn('tabular-nums', SIZES[size], className)}>{formatPrice(cents, locale)}</span>
  );
}
