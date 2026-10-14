import {
  alertInputFromSeries,
  alertKind,
  alertMail,
  localizedPath,
  renderMail,
  SITE_ORIGIN,
  stayPath,
  toIsoDate,
  type AlertKind,
} from '@tidaq/core';
import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import type { CollectorStore } from './store';

const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'Tidaq <alarm@tidaq.com>';

export interface AlertRunSummary {
  today: string;
  watches: number;
  /** Alerts due today, by kind. */
  due: Partial<Record<AlertKind, number>>;
  sent: number;
  /** ALERTS_DRY_RUN or not production: due alerts were only logged. */
  dryRun: boolean;
  failed: number;
}

/** Real emails only in production with `ALERTS_DRY_RUN=false` and a key (CLAUDE.md rule 5). */
export function alertsLive(env: Pick<Env, 'APP_ENV' | 'ALERTS_DRY_RUN' | 'RESEND_API_KEY'>) {
  return env.APP_ENV === 'production' && env.ALERTS_DRY_RUN === 'false' && !!env.RESEND_API_KEY;
}

/**
 * Price alerts (C-031), once a day after the morning data: for each active, confirmed watch,
 * decide with core `alertKind` (target, new low, drop, near low; one email per watch and day),
 * send it through Resend with a one-click unsubscribe, and record it. Dry runs log the kind
 * only. Never logs an address; one failed email doesn't stop the others.
 */
export async function runAlerts(opts: {
  store: CollectorStore;
  env: Pick<Env, 'APP_ENV' | 'ALERTS_DRY_RUN' | 'RESEND_API_KEY'>;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<AlertRunSummary> {
  const { store, env, now, fetchFn = fetch } = opts;
  const today = toIsoDate(now.getTime());
  const live = alertsLive(env);
  const watches = await store.alertInputs(today);
  const summary: AlertRunSummary = {
    today,
    watches: watches.length,
    due: {},
    sent: 0,
    dryRun: !live,
    failed: 0,
  };

  for (const w of watches) {
    const input = alertInputFromSeries(w.series, today, w.checkIn, w);
    const kind = input && alertKind(input);
    if (!input || !kind) continue;
    summary.due[kind] = (summary.due[kind] ?? 0) + 1;
    if (!live) {
      console.log(JSON.stringify({ msg: 'alert dry run', kind }));
      continue;
    }
    const manageUrl = SITE_ORIGIN + localizedPath(`/alarm/verwalten/${w.manageToken}`, w.locale);
    const { subject, content } = alertMail({
      kind,
      locale: w.locale,
      hotel: w.hotelName,
      checkIn: w.checkIn,
      checkOut: w.checkOut,
      adults: w.adults,
      nowCents: input.nowCents,
      targetCents: w.targetCents,
      lastAlertCents: w.lastAlertCents,
      stayUrl:
        SITE_ORIGIN +
        localizedPath(stayPath(w.hotelSlug, w.checkIn, w.checkOut, w.adults), w.locale),
      manageUrl,
    });
    const { html, text } = renderMail(content);
    try {
      const res = await fetchFn(RESEND_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [w.email],
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<${SITE_ORIGIN}/api/watch/unsubscribe?token=${w.manageToken}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      });
      if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
      const body = (await res.json().catch(() => ({}))) as { id?: unknown };
      await store.recordAlert(
        w.watchId,
        kind,
        input.nowCents,
        typeof body.id === 'string' ? body.id : null,
      );
      summary.sent++;
    } catch (err) {
      summary.failed++;
      console.log(JSON.stringify({ msg: 'alert failed', kind, error: String(err) }));
    }
  }
  return summary;
}
