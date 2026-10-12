import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import type { PostRunSummary } from './morning';

const RESEND_API = 'https://api.resend.com/emails';
/** Sender on the verified Resend domain (D-14). */
export const ADMIN_FROM = 'Tidaq Collector <collector@tidaq.com>';
/** Error lines quoted in one email; the rest is counted. */
const MAX_ERROR_LINES = 8;

export interface AdminEmail {
  subject: string;
  lines: string[];
}

export type SendResult = 'sent' | 'skipped' | 'failed';

/** `ADMIN_EMAILS` is a comma-separated list (Cloudflare var). */
export function adminRecipients(env: Pick<Env, 'ADMIN_EMAILS'>): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

/** First errors in full, the rest as a count. */
export function errorLines(errors: readonly string[]): string[] {
  const shown = errors.slice(0, MAX_ERROR_LINES).map((e) => `- ${e}`);
  if (errors.length > MAX_ERROR_LINES)
    shown.push(`- … and ${errors.length - MAX_ERROR_LINES} more`);
  return shown;
}

/**
 * Plain-text email to the admins (operations only, never to users, so ALERTS_DRY_RUN does not
 * apply). Never throws: a broken mail setup must not break a collector run. Never logs addresses.
 */
export async function sendAdminEmail(
  env: Pick<Env, 'ADMIN_EMAILS' | 'RESEND_API_KEY' | 'APP_ENV'>,
  email: AdminEmail,
  fetchFn: FetchFn = fetch,
): Promise<SendResult> {
  const to = adminRecipients(env);
  if (!env.RESEND_API_KEY || to.length === 0) {
    console.log(
      JSON.stringify({ msg: 'admin email skipped (not configured)', subject: email.subject }),
    );
    return 'skipped';
  }
  try {
    const res = await fetchFn(RESEND_API, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: ADMIN_FROM,
        to,
        subject: `[${env.APP_ENV}] ${email.subject}`,
        text: [...email.lines, '', '— Tidaq collector (automatic email)'].join('\n'),
      }),
    });
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
    console.log(
      JSON.stringify({ msg: 'admin email sent', subject: email.subject, recipients: to.length }),
    );
    return 'sent';
  } catch (err) {
    console.log(
      JSON.stringify({ msg: 'admin email failed', subject: email.subject, error: String(err) }),
    );
    return 'failed';
  }
}

/** Email after a posting run, or null when it went fine and the budget didn't cross 80 %. */
export function postingEmail(s: PostRunSummary): AdminEmail | null {
  const lines: string[] = [];
  if (s.errors.length > 0) {
    lines.push(
      `The ${s.kind} run on ${s.today} posted ${s.posted} of ${s.jobs} stays with ${s.errors.length} error(s):`,
      ...errorLines(s.errors),
      '',
    );
  }
  if (s.monthlyAlertCrossed) {
    lines.push(
      `Data spend this month just passed 80 % of MONTHLY_BUDGET_USD (estimate incl. this run: $${s.monthSpendUsd.toFixed(2)}).`,
      'The budget guard stops posting at 100 %. Nothing to do unless that is too early.',
      '',
    );
  }
  if (lines.length === 0) return null;
  const subject =
    s.errors.length > 0
      ? `Collector: ${s.kind} run had ${s.errors.length} error(s)`
      : 'Collector: 80 % of the monthly data budget used';
  return { subject, lines: lines.slice(0, -1) };
}

/** Email when a run crashed before it could finish. */
export function crashEmail(what: string, err: unknown): AdminEmail {
  return {
    subject: `Collector: ${what} failed`,
    lines: [
      `The ${what} stopped with an error:`,
      `- ${err instanceof Error ? err.message : String(err)}`,
      '',
      'Details: Cloudflare → Workers → tidaq-collector → Logs, and collector_runs in Supabase.',
    ],
  };
}
