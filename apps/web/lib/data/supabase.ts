import 'server-only';
import { z } from '@tidaq/core';

/** Reads time out after this long; pages then fall back to their empty or example state. */
const TIMEOUT_MS = 4000;

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

/** False in CI and local dev without env: callers show fallbacks instead of failing. */
export function hasSupabase(): boolean {
  return config() !== null;
}

/**
 * GET a PostgREST path (`v_stay_public?select=…`) with the public anon key and validate every
 * row with Zod. RLS decides what is visible (CLAUDE.md §5: validate external data).
 */
export async function rest<T extends z.ZodType>(path: string, row: T): Promise<z.infer<T>[]> {
  const cfg = config();
  if (!cfg) throw new Error('Supabase is not configured (SUPABASE_URL, SUPABASE_ANON_KEY)');
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}`, accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} for ${path.split('?')[0]}`);
  return z.array(row).parse(await res.json());
}

/**
 * Call a Postgres function (`rpc/<name>`) with the anon key and validate the result with Zod.
 * Only functions anon may execute are reachable (e.g. `stay_history_from_nights`,
 * `request_stay`).
 */
export async function rpc<T extends z.ZodType>(
  name: string,
  args: Record<string, unknown>,
  result: T,
  timeoutMs = TIMEOUT_MS,
): Promise<z.infer<T>> {
  const cfg = config();
  if (!cfg) throw new Error('Supabase is not configured (SUPABASE_URL, SUPABASE_ANON_KEY)');
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} for rpc/${name}`);
  // Functions returning void answer 204 with an empty body: parse that as null.
  const body = await res.text();
  return result.parse(body ? JSON.parse(body) : null);
}
