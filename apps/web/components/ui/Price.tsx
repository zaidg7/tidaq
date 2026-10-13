import { useLocale } from 'next-intl';
import type { Locale } from '@tidaq/core';
import { PriceText, type PriceSize } from './PriceText';

export type { PriceSize };

type Props = { cents: number; size?: PriceSize; className?: string };

/** `PriceText` with the request locale, for server components. Client components use `PriceText`. */
export function Price(props: Props) {
  return <PriceText {...props} locale={useLocale() as Locale} />;
}
