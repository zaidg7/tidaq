/** Bindings and vars of the collector worker (see wrangler.jsonc and CLAUDE.md §7). */
export interface Env {
  APP_ENV: 'production' | 'staging';
  DAILY_TASK_CAP: string;
  MONTHLY_BUDGET_USD: string;
  EVENING_RUN: string;
  GRID_WEEKENDS: string;
  GRID_MIDWEEK: string;
  ALERTS_DRY_RUN: string;
  /** Comma-separated admin addresses for operations emails (Cloudflare var). */
  ADMIN_EMAILS?: string;
  /** Results fetched per collect invocation (default 30, see COLLECT in collect.ts). */
  COLLECT_BATCH?: string;
  /** Night grid (C-070a): nights ahead per hotel (default 120, 0 = off) and nights per run. */
  NIGHT_WINDOW_DAYS?: string;
  NIGHT_BATCH?: string;
  /** Exact quotes for Price Drops (C-148): paid tasks a day and USD a month at most. */
  DROP_QUOTE_DAILY_CAP?: string;
  DROP_QUOTE_MONTHLY_USD?: string;
  /** `xotelo` (free, D-41) or `dataforseo` (paid fallback). Default `dataforseo`. */
  PRICE_SOURCE?: string;
  // Secrets (wrangler secret bulk from GitHub secrets in deploy.yml). Optional until C-013 uses them.
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
}

export type PriceSource = 'xotelo' | 'dataforseo';

/** Where prices come from (D-41). Anything but `xotelo` keeps the paid DataForSEO path. */
export function priceSource(env: Pick<Env, 'PRICE_SOURCE'>): PriceSource {
  return env.PRICE_SOURCE?.trim().toLowerCase() === 'xotelo' ? 'xotelo' : 'dataforseo';
}
