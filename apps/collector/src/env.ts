/** Bindings and vars of the collector worker (see wrangler.jsonc and CLAUDE.md §7). */
export interface Env {
  APP_ENV: 'production' | 'staging';
  DAILY_TASK_CAP: string;
  MONTHLY_BUDGET_USD: string;
  EVENING_RUN: string;
  GRID_WEEKENDS: string;
  GRID_MIDWEEK: string;
  ALERTS_DRY_RUN: string;
  /** Results fetched per collect invocation (default 30, see COLLECT in collect.ts). */
  COLLECT_BATCH?: string;
  // Secrets (wrangler secret bulk from GitHub secrets in deploy.yml). Optional until C-013 uses them.
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
}
