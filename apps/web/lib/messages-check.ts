/**
 * Compile-time checks for the message files (no runtime code).
 * - `en.json` must have exactly the keys of `de.json` (German is the source).
 * - Every advice key, stay state and trend from `@tidaq/core` must have copy.
 */
import type { AdviceKey, StayState, Trend } from '@tidaq/core';
import type de from '@/messages/de.json';
import type en from '@/messages/en.json';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Keys<T> = T extends string ? never : { [K in keyof T]: Keys<T[K]> };

export const enMatchesDe: Same<Keys<typeof de>, Keys<typeof en>> = true;
// `soon` is the extra note shown within 7 days of check-in.
export const adviceHasCopy: Same<AdviceKey | 'soon', keyof (typeof de)['advice']> = true;
export const statesHaveCopy: Same<StayState, keyof (typeof de)['state']> = true;
export const shortStatesHaveCopy: Same<StayState, keyof (typeof de)['stateShort']> = true;
export const trendsHaveCopy: Same<Trend, keyof (typeof de)['trend']> = true;
