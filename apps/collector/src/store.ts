import type { BudgetReason, GridHotel, GridStay } from '@tidaq/core';

/** A hotel the collector may price. */
export interface CatalogHotel extends GridHotel {
  dfsHotelIdentifier: string;
}

/** An active stay to price, with what DataForSEO needs. */
export interface StayJob {
  stayId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  hotelIdentifier: string;
  watched: boolean;
}

export type RunKind = 'morning' | 'evening' | 'collect' | 'manual';

export interface RunPatch {
  finishedAt: string;
  tasksPosted?: number;
  tasksSkipped?: number;
  tasksDone?: number;
  estCostUsd?: number;
  budgetReason?: BudgetReason;
  errors?: unknown[];
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
  /** Tasks posted since `today` 00:00 UTC and estimated spend since the 1st of the month. */
  usage(today: string): Promise<{ postedToday: number; spentThisMonthUsd: number }>;
  startRun(kind: RunKind, env: 'production' | 'staging', startedAt: string): Promise<number>;
  finishRun(runId: number, patch: RunPatch): Promise<void>;
  recordTasks(
    runId: number,
    tasks: readonly { id: string; stayId: number; costUsd: number }[],
  ): Promise<void>;
}
