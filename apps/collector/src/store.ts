import type {
  AlertKind,
  BudgetReason,
  DailyPrice,
  GridHotel,
  GridStay,
  NightAccuracyDay,
  PriceDropRow,
  StayOffer,
  StayState,
} from '@tidaq/core';
import type { IngestPayload, OpenTask } from './ingest';

/** A hotel the collector may price: it has an id for at least one price source. */
export interface CatalogHotel extends GridHotel {
  dfsHotelIdentifier: string | null;
  /** TripAdvisor key for Xotelo (D-41), e.g. `g187323-d289019`. */
  xoteloKey: string | null;
}

/** An active stay to price, with what each source needs (null: the hotel has no id there). */
export interface StayJob {
  stayId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  hotelIdentifier: string | null;
  xoteloKey: string | null;
  watched: boolean;
}

/**
 * `request`: queues requested stays (origin `watch`) that have no task yet (C-022c1).
 * `nights`: prices single nights for the night grid (C-070a).
 */
export type RunKind = 'morning' | 'evening' | 'collect' | 'manual' | 'request' | 'nights';

/** A (hotel, night) pair still to price today (SQL `night_jobs`, C-070a). */
export interface NightJob {
  hotelId: number;
  xoteloKey: string;
  /** The night (check-in date); check-out is the next day. */
  night: string;
}

/** One batch for SQL `night_ingest`: unknown platforms and per-night rates by provider slug. */
export interface NightIngestPayload {
  providers: { slug: string; name: string; domain: string | null; alias: string }[];
  nights: { hotel_id: number; night: string; day: string; offers: Record<string, number> }[];
}

/** One `night_accuracy` day (C-070c): night sums vs real stay prices on the same platform. */
export interface NightAccuracyRow extends NightAccuracyDay {
  /**
   * Pairs and matches of hotels whose night history is shown (C-070d hides unreliable ones):
   * what the alarm watches.
   */
  pairsShown: number;
  within3Shown: number;
  /** Median gap in percent, null without pairs. */
  medianGapPct: number | null;
  /** Hotels with the lowest share within 3 % (at least 4 pairs), weakest first. */
  worst: { name: string; pairs: number; within3: number }[];
}

export interface RunPatch {
  finishedAt: string;
  tasksPosted?: number;
  tasksSkipped?: number;
  tasksDone?: number;
  estCostUsd?: number;
  budgetReason?: BudgetReason;
  /** The daily task cap a posting run used; `request_stay()` reads it as the capacity. */
  dailyCap?: number;
  errors?: unknown[];
}

/** Today's runs and the status of tasks posted today, for the daily check. */
export interface DayReport {
  runs: {
    kind: RunKind;
    env: string;
    startedAt: string;
    finishedAt: string | null;
    errors: string[];
  }[];
  /** Tasks posted today by status (`posted` = still without result). */
  tasks: { posted: number; done: number; noResults: number; failed: number };
}

/** One `stay_stats` row. */
export interface StayStatsRow {
  stay_id: number;
  updated_at: string;
  days_tracked: number;
  now_cents: number | null;
  low_cents: number | null;
  high_cents: number | null;
  avg30_cents: number | null;
  percentile: number | null;
  trend_7d: number | null;
  state: StayState;
}

/**
 * Everything the collector reads and writes. `supabaseStore` implements it against Postgres;
 * tests use an in-memory version. Keeps the run logic free of SQL.
 */
export interface CollectorStore {
  activeHotels(): Promise<CatalogHotel[]>;
  /** Inserts missing grid stays (origin `grid`); existing ones are left alone. Returns inserted count. */
  upsertGridStays(stays: readonly GridStay[]): Promise<number>;
  /** Sets `active = false` on stays whose check-in is before `today`. Returns the count. */
  deactivatePastStays(today: string): Promise<number>;
  /** Active stays of active hotels with an identifier, check-in today or later. */
  stayJobs(today: string): Promise<StayJob[]>;
  /**
   * Requested stays (origin `watch`) that never had a task: active, hotel active, check-in today
   * or later. They get their first prices right away instead of the next morning (C-022c1).
   */
  requestedStayJobs(today: string): Promise<StayJob[]>;
  /** Tasks posted since `today` 00:00 UTC and estimated spend since the 1st of the month. */
  usage(today: string): Promise<{ postedToday: number; spentThisMonthUsd: number }>;
  startRun(kind: RunKind, env: 'production' | 'staging', startedAt: string): Promise<number>;
  finishRun(runId: number, patch: RunPatch): Promise<void>;
  recordTasks(
    runId: number,
    tasks: readonly { id: string; stayId: number; costUsd: number }[],
  ): Promise<void>;
  /** Tasks still waiting for results (`status = 'posted'`), oldest first, at most `limit`. */
  openTasks(limit: number): Promise<OpenTask[]>;
  /** Alias → provider slug (`provider_aliases`), for `normalizeHotelInfo`. */
  providerAliases(): Promise<Map<string, string>>;
  /**
   * Writes snapshots, pending providers, task statuses and official URLs, then rebuilds
   * `stay_daily` for the touched stay days, in one transaction (SQL `collector_ingest`).
   */
  ingest(payload: IngestPayload): Promise<{ snapshots: number; dailyRows: number }>;
  /** `stay_daily` best prices of these stays from `fromDay` on. */
  dailySeries(
    stayIds: readonly number[],
    fromDay: string,
  ): Promise<(DailyPrice & { stayId: number })[]>;
  upsertStats(rows: readonly StayStatsRow[]): Promise<void>;
  /** Runs started today (UTC) and today's task statuses. */
  dayReport(today: string): Promise<DayReport>;
  /** Nights without a row for `today`, nearest first (SQL `night_jobs`). */
  nightJobs(today: string, window: number, limit: number): Promise<NightJob[]>;
  /** Stores a batch of nights (SQL `night_ingest`). Returns the rows written. */
  ingestNights(payload: NightIngestPayload): Promise<number>;
  /** Compares `day`'s night sums with its real stay prices and stores the result (C-070c). */
  recordNightAccuracy(day: string): Promise<NightAccuracyRow>;
  /** Stored accuracy days from `fromDay` on, newest first. */
  nightAccuracy(fromDay: string): Promise<NightAccuracyRow[]>;
  /** Confirmed addresses with the weekly deals newsletter on (C-054b). */
  newsletterRecipients(): Promise<NewsletterRecipient[]>;
  /**
   * Confirmed addresses with the Preissturz-Alarm on that haven't had one today (C-080e2).
   * `city`: a city slug, or null for all cities.
   */
  dropAlertRecipients(today: string): Promise<DropAlertRecipient[]>;
  /** Today's sudden drops (SQL `radar_drops`, C-080a/d), validated. */
  todayDrops(today: string): Promise<PriceDropRow[]>;
  /** Records the day of the last Preissturz-Alarm for these watcher ids (one a day, C-080e2). */
  markDropAlertsSent(ids: string[], today: string): Promise<void>;
  /** Upcoming active stays with 14+ days of data and a price today, for core `pickDeals`. */
  dealCandidates(today: string): Promise<DealRow[]>;
  /** The website's most frequent server errors since `since` (SQL `web_error_digest`, C-041c). */
  webErrors(env: string, since: string): Promise<WebErrorRow[]>;
  /** Removes raw JSON older than 30 days (SQL `prune_raw_snapshots`, D-19). Returns the count. */
  pruneRaw(): Promise<number>;
  /**
   * Active watches of confirmed, subscribed addresses with check-in after `today`, each with its
   * last 60 days (stay checks, else reliable night sums; SQL `alert_inputs`, C-031).
   */
  alertInputs(today: string): Promise<AlertWatch[]>;
  /**
   * Today's offers for the watch's stay on reviewed providers, with their checkout-test record
   * (SQL `alert_offers`, C-031b): for the alert email's best trusted provider.
   */
  alertOffers(watchId: string, today: string): Promise<AlertOffer[]>;
  /** Stores a sent alert and the watch's last alert price and time (SQL `alert_record`). */
  recordAlert(
    watchId: string,
    kind: AlertKind,
    priceCents: number,
    resendId: string | null,
  ): Promise<void>;
}

export interface NewsletterRecipient {
  email: string;
  locale: 'de' | 'en';
  manageToken: string;
}

export interface DropAlertRecipient extends NewsletterRecipient {
  id: string;
  city: string | null;
}

export interface DealRow {
  stayId: number;
  hotelSlug: string;
  hotelName: string;
  cityName: { de: string; en: string };
  checkIn: string;
  checkOut: string;
  adults: number;
  nowCents: number | null;
  avg30Cents: number | null;
  daysTracked: number | null;
}

export interface WebErrorRow {
  source: string;
  message: string;
  n: number;
  lastAt: string;
}

/** A provider's stay total today, ready for core `rankOffers`, plus its slug for `/go/…`. */
export type AlertOffer = StayOffer & { slug: string; partner: boolean };

export interface AlertWatch {
  watchId: string;
  email: string;
  locale: 'de' | 'en';
  manageToken: string;
  hotelSlug: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  targetCents: number | null;
  lastAlertCents: number | null;
  lastAlertAt: string | null;
  series: DailyPrice[];
}
