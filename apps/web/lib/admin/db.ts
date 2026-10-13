import 'server-only';
import { runToken, z } from '@tidaq/core';

/**
 * Service-role access for the admin area (C-016). Server only, and only after `requireAdmin()`:
 * the service key bypasses RLS. Every response is validated with Zod.
 */

const TIMEOUT_MS = 8000;

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

export function hasServiceRole(): boolean {
  return config() !== null;
}

async function call(path: string, init: { method: 'GET' | 'POST' | 'PATCH'; body?: object }) {
  const cfg = config();
  if (!cfg) throw new Error('Supabase service role is not configured');
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method: init.method,
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      'content-type': 'application/json',
      accept: 'application/json',
      prefer: 'return=minimal',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Supabase ${res.status} on ${path.split('?')[0]}: ${detail}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

const count = z.coerce.number().int();
const usd = z.coerce.number();

const daySchema = z.object({
  day: z.string(),
  runs: count,
  posted: count,
  collected: count,
  skipped: count,
  cost_usd: usd,
  errors: count,
  unfinished: count,
  first_error: z.string().nullable(),
  budget_reason: z.string().nullable(),
});

const hotelSchema = z.object({ id: count, slug: z.string(), name: z.string() });

export const adminHealthSchema = z.object({
  today: z.string(),
  generated_at: z.string(),
  days: z.array(daySchema),
  month_cost_usd: usd,
  last_run_at: z.string().nullable(),
  coverage: z.object({
    hotels: count,
    stays: count,
    with_today: count,
    with_yesterday: count,
  }),
  stale_hotels: z.array(hotelSchema.extend({ last_day: z.string().nullable() })),
  inactive_hotels: z.array(hotelSchema),
  pending_total: count,
  pending_providers: z.array(
    z.object({
      id: count,
      slug: z.string(),
      name: z.string(),
      domain: z.string().nullable(),
      offers: count,
      last_seen: z.string().nullable(),
    }),
  ),
});
export type AdminHealth = z.infer<typeof adminHealthSchema>;
export type AdminDay = z.infer<typeof daySchema>;

export async function getAdminHealth(): Promise<AdminHealth> {
  return adminHealthSchema.parse(await call('rpc/admin_health', { method: 'POST', body: {} }));
}

/** Marks a pending provider as reviewed, then rebuilds best prices so they include it (C-019). */
export async function approveProvider(id: number) {
  await call(`providers?id=eq.${id}&pending=eq.true`, {
    method: 'PATCH',
    body: { pending: false },
  });
  await call('rpc/rebuild_stay_daily', { method: 'POST', body: {} });
}

/** Turns collection for a hotel off or on. The grid skips inactive hotels from the next run. */
export async function setHotelActive(id: number, active: boolean) {
  await call(`hotels?id=eq.${id}`, { method: 'PATCH', body: { active } });
}

const runResponse = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Starts a posting run on the **staging** collector (DAILY_TASK_CAP 50 there, budget guard
 * inside). Authenticated with the shared run token derived from the service key.
 */
export async function runStagingCollector(): Promise<z.infer<typeof runResponse>> {
  const cfg = config();
  const base = process.env.COLLECTOR_STAGING_URL;
  if (!cfg || !base) throw new Error('COLLECTOR_STAGING_URL or the service key is missing');
  const res = await fetch(`${base.replace(/\/$/, '')}/run`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await runToken(cfg.key)}` },
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store',
  });
  return runResponse.parse(await res.json());
}
