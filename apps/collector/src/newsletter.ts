import {
  localizedPath,
  NEWSLETTER,
  newsletterMail,
  pickDeals,
  renderMail,
  SITE_ORIGIN,
  stayPath,
  toIsoDate,
  type NewsletterDeal,
} from '@tidaq/core';
import { alertsLive } from './alerts';
import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import type { CollectorStore } from './store';

const RESEND_BATCH_API = 'https://api.resend.com/emails/batch';
const FROM = 'Tidaq <deals@tidaq.com>';

export interface NewsletterRunSummary {
  today: string;
  /** Not Monday, too few deals or nobody subscribed: nothing to send. */
  skipped: 'weekday' | 'few_deals' | 'no_recipients' | null;
  deals: number;
  recipients: number;
  sent: number;
  failed: number;
  dryRun: boolean;
}

/**
 * Weekly deals newsletter (C-054b), in the daily cron after the alerts, on Mondays only: the
 * current deals (core `pickDeals`, same rule as /deals, top 8), one email per subscriber with
 * their own manage and one-click unsubscribe links, sent through Resend's batch API. Real
 * emails only when the alerts are live (production, ALERTS_DRY_RUN=false, a key); otherwise it
 * logs counts. Never logs an address and doesn't track opens or clicks.
 */
export async function runNewsletter(opts: {
  store: CollectorStore;
  env: Pick<Env, 'APP_ENV' | 'ALERTS_DRY_RUN' | 'RESEND_API_KEY'>;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<NewsletterRunSummary> {
  const { store, env, now, fetchFn = fetch } = opts;
  const today = toIsoDate(now.getTime());
  const live = alertsLive(env);
  const summary: NewsletterRunSummary = {
    today,
    skipped: null,
    deals: 0,
    recipients: 0,
    sent: 0,
    failed: 0,
    dryRun: !live,
  };
  if (now.getUTCDay() !== NEWSLETTER.weekday) return { ...summary, skipped: 'weekday' };

  const picked = pickDeals(await store.dealCandidates(today), NEWSLETTER.maxDeals);
  summary.deals = picked.length;
  if (picked.length < NEWSLETTER.minDeals) return { ...summary, skipped: 'few_deals' };

  const recipients = await store.newsletterRecipients();
  summary.recipients = recipients.length;
  if (recipients.length === 0) return { ...summary, skipped: 'no_recipients' };
  if (!live) {
    console.log(JSON.stringify({ msg: 'newsletter dry run', ...summary }));
    return summary;
  }

  const dealsFor = (locale: 'de' | 'en'): NewsletterDeal[] =>
    picked.map((d) => ({
      hotel: d.hotelName,
      city: d.cityName[locale],
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      nowCents: d.nowCents as number,
      drop: d.drop,
      url:
        SITE_ORIGIN + localizedPath(stayPath(d.hotelSlug, d.checkIn, d.checkOut, d.adults), locale),
    }));
  const byLocale = { de: dealsFor('de'), en: dealsFor('en') };

  const emails = recipients.map((r) => {
    const { subject, content } = newsletterMail({
      locale: r.locale,
      deals: byLocale[r.locale],
      dealsUrl: SITE_ORIGIN + localizedPath('/deals', r.locale),
      manageUrl: SITE_ORIGIN + localizedPath(`/alarm/verwalten/${r.manageToken}`, r.locale),
    });
    const { html, text } = renderMail(content);
    return {
      from: FROM,
      to: [r.email],
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${SITE_ORIGIN}/api/watch/unsubscribe?token=${r.manageToken}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  });

  for (let i = 0; i < emails.length; i += NEWSLETTER.batchSize) {
    const batch = emails.slice(i, i + NEWSLETTER.batchSize);
    try {
      const res = await fetchFn(RESEND_BATCH_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
      summary.sent += batch.length;
    } catch (err) {
      summary.failed += batch.length;
      console.log(JSON.stringify({ msg: 'newsletter batch failed', error: String(err) }));
    }
  }
  return summary;
}
