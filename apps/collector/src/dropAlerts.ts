import {
  DROP_ALERTS,
  dropAlertMail,
  dropPath,
  dropsFor,
  groupDrops,
  localizedPath,
  renderMail,
  SITE_ORIGIN,
  toIsoDate,
  type HotelDrops,
} from '@tidaq/core';
import { alertsLive } from './alerts';
import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import type { CollectorStore } from './store';

const RESEND_BATCH_API = 'https://api.resend.com/emails/batch';
const FROM = 'Tidaq <alarm@tidaq.com>';

export interface DropAlertRunSummary {
  today: string;
  /** No new drop since the last send or nobody subscribed: nothing to send. */
  skipped: 'no_drops' | 'no_recipients' | null;
  /** Hotels with a drop seen in the last 24 hours. */
  hotels: number;
  recipients: number;
  /** Recipients with at least one drop in their city. */
  matched: number;
  sent: number;
  failed: number;
  dryRun: boolean;
}

/**
 * Preissturz-Alarm (C-080e2), in the daily cron after the newsletter: the drops seen in the 24
 * hours since the last send (each drop is mailed once, also those the night grid found after the
 * previous send), per subscriber the ones in their city (or all),
 * one email each with their own manage and one-click unsubscribe links, sent through Resend's
 * batch API; sent addresses get today's date, so nobody gets two in a day. Real emails only when
 * the alerts are live (production, ALERTS_DRY_RUN=false, a key); otherwise it logs counts.
 * Never logs an address and doesn't track opens or clicks.
 */
export async function runDropAlerts(opts: {
  store: CollectorStore;
  env: Pick<Env, 'APP_ENV' | 'ALERTS_DRY_RUN' | 'RESEND_API_KEY'>;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<DropAlertRunSummary> {
  const { store, env, now, fetchFn = fetch } = opts;
  // The daily cron runs at 07:55 UTC: the same calendar day in Berlin.
  const today = toIsoDate(now.getTime());
  const live = alertsLive(env);
  const summary: DropAlertRunSummary = {
    today,
    skipped: null,
    hotels: 0,
    recipients: 0,
    matched: 0,
    sent: 0,
    failed: 0,
    dryRun: !live,
  };

  const since = now.getTime() - DROP_ALERTS.windowHours * 3_600_000;
  const groups = groupDrops(
    (await store.todayDrops(today)).filter((d) => Date.parse(d.seen_at) >= since),
  );
  summary.hotels = groups.length;
  if (groups.length === 0) return { ...summary, skipped: 'no_drops' };

  const recipients = await store.dropAlertRecipients(today);
  summary.recipients = recipients.length;
  if (recipients.length === 0) return { ...summary, skipped: 'no_recipients' };

  const jobs = recipients
    .map((r) => ({ r, drops: dropsFor(groups, r.city, since) }))
    .filter((j) => j.drops.length > 0);
  summary.matched = jobs.length;
  if (!live) {
    console.log(JSON.stringify({ msg: 'drop alerts dry run', ...summary }));
    return summary;
  }

  const cityName = (slug: string | null, locale: 'de' | 'en', drops: HotelDrops[]) =>
    slug ? (drops[0]?.city.name[locale] ?? null) : null;
  const emails = jobs.map(({ r, drops }) => {
    const { subject, content } = dropAlertMail({
      locale: r.locale,
      groups: drops,
      cityName: cityName(r.city, r.locale, drops),
      dropUrl: (slug, stay) => SITE_ORIGIN + localizedPath(dropPath(slug, stay), r.locale),
      radarUrl:
        SITE_ORIGIN +
        localizedPath('/preissturz', r.locale) +
        (r.city ? `?stadt=${encodeURIComponent(r.city)}` : ''),
      manageUrl: SITE_ORIGIN + localizedPath(`/alarm/verwalten/${r.manageToken}`, r.locale),
    });
    const { html, text } = renderMail(content);
    return {
      id: r.id,
      email: {
        from: FROM,
        to: [r.email],
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${SITE_ORIGIN}/api/watch/unsubscribe?token=${r.manageToken}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
    };
  });

  for (let i = 0; i < emails.length; i += DROP_ALERTS.batchSize) {
    const batch = emails.slice(i, i + DROP_ALERTS.batchSize);
    try {
      const res = await fetchFn(RESEND_BATCH_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(batch.map((b) => b.email)),
      });
      if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
      summary.sent += batch.length;
    } catch (err) {
      summary.failed += batch.length;
      console.log(JSON.stringify({ msg: 'drop alert batch failed', error: String(err) }));
      continue;
    }
    // Sent: never twice today, even if the cron runs again.
    await store.markDropAlertsSent(
      batch.map((b) => b.id),
      today,
    );
  }
  return summary;
}
