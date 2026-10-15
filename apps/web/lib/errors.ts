import 'server-only';
import { after } from 'next/server';
import { scrubErrorText } from '@tidaq/core';
import { hasServiceRole, serviceRest } from '@/lib/admin/db';

type Context = Record<string, string | number | boolean | null | undefined>;

/** Which `web_errors` environment this Worker writes to (APP_ENV is a Worker var). */
function appEnv(): 'production' | 'staging' | 'development' {
  const env = process.env.APP_ENV;
  return env === 'production' || env === 'staging' ? env : 'development';
}

function message(error: unknown, ctx: Context): string {
  const extra = Object.entries(ctx)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ');
  return scrubErrorText(
    `${error instanceof Error ? error.message : String(error)}${extra ? ` (${extra})` : ''}`,
  );
}

/** Stores one error for the daily check (C-041c). Never throws; no database, no record. */
export async function recordError(source: string, error: unknown, ctx: Context = {}) {
  if (!hasServiceRole()) return;
  try {
    await serviceRest('rpc/log_web_error', null, {
      method: 'POST',
      body: { p_env: appEnv(), p_source: source, p_message: message(error, ctx) },
    });
  } catch (e) {
    console.error(JSON.stringify({ msg: 'error log failed', error: String(e) }));
  }
}

/**
 * A server error the page handled (it shows its fallback): logged to Workers Logs and, after
 * the response, stored for the admins' daily check email. Context is for slugs and ids of
 * public things only, never addresses or tokens.
 */
export function reportError(source: string, error: unknown, ctx: Context = {}) {
  console.error(JSON.stringify({ msg: source, ...ctx, error: String(error) }));
  const store = () => recordError(source, error, ctx);
  try {
    after(store);
  } catch {
    // Outside a request (build, scripts): store right away, best effort.
    void store();
  }
}
