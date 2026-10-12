/** Bindings and vars of the collector worker (see wrangler.jsonc and CLAUDE.md §7). */
export interface Env {
  DAILY_TASK_CAP: string;
  MONTHLY_BUDGET_USD: string;
  EVENING_RUN: string;
  GRID_WEEKENDS: string;
  GRID_MIDWEEK: string;
  ALERTS_DRY_RUN: string;
}
