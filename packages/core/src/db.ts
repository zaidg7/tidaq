import type { Tables } from './db.types';

// Row types for the tables and views the apps read. Generated base types live in db.types.ts.
export type City = Tables<'cities'>;
export type Hotel = Tables<'hotels'>;
export type Provider = Tables<'providers'>;
export type TrackedStay = Tables<'tracked_stays'>;
export type PriceSnapshot = Tables<'price_snapshots'>;
export type StayDaily = Tables<'stay_daily'>;
export type StayStats = Tables<'stay_stats'>;
export type TrustTest = Tables<'trust_tests'>;
export type ProviderScore = Tables<'provider_scores'>;
export type CollectorRun = Tables<'collector_runs'>;
export type StayPublic = Tables<'v_stay_public'>;
export type HotelCalendarRow = Tables<'v_hotel_calendar'>;

/** Values allowed by the `stay_stats.state` check constraint (PLAN §8.1). */
export const stayStates = ['collecting', 'near_low', 'good', 'normal', 'high'] as const;
export type StayState = (typeof stayStates)[number];

/** Values allowed by the `tracked_stays.origin` check constraint. */
export const stayOrigins = ['grid', 'watch', 'manual'] as const;
export type StayOrigin = (typeof stayOrigins)[number];

/** Values allowed by the `trust_tests.outcome` check constraint. */
export const trustOutcomes = ['match', 'higher', 'lower', 'unavailable'] as const;
export type TrustOutcome = (typeof trustOutcomes)[number];
