import type { Env } from '../env';

export const testEnv = (over: Partial<Env> = {}): Env => ({
  APP_ENV: 'staging',
  DAILY_TASK_CAP: '300',
  MONTHLY_BUDGET_USD: '12',
  EVENING_RUN: 'false',
  GRID_WEEKENDS: '6',
  GRID_MIDWEEK: '2',
  ALERTS_DRY_RUN: 'true',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  ...over,
});
