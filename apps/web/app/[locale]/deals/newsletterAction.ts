'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { clientIp, createRateLimiter, isLocale } from '@tidaq/core';
import { requestNewsletter, type NewsletterStatus } from '@/lib/watch/newsletter';

export type NewsletterFormState =
  | { status: 'idle' }
  | {
      status: NewsletterStatus | 'rate_limited';
      previewUrl?: string;
      /** What was entered, so a failed attempt keeps the form filled (React resets forms). */
      values?: { email: string; consent: boolean };
    };

/** 5 sign-ups per 10 minutes per IP and Worker isolate (like the watch form, C-030b). */
const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 });

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

/** "Deals per E-Mail" on /deals (C-054a). */
export async function newsletterAction(
  _prev: NewsletterFormState,
  form: FormData,
): Promise<NewsletterFormState> {
  const values = { email: str(form, 'email'), consent: form.get('consent') === 'on' };
  return { ...(await submit(form)), values };
}

async function submit(form: FormData): Promise<Exclude<NewsletterFormState, { status: 'idle' }>> {
  // Honeypot: people never see this field; bots fill it. Pretend it worked.
  if (str(form, 'website')) return { status: 'sent' };
  const h = await headers();
  const ip = clientIp(h);
  if (ip && limiter.limited(ip)) return { status: 'rate_limited' };
  if (form.get('consent') !== 'on') return { status: 'invalid' };

  const locale = isLocale(str(form, 'locale')) ? (str(form, 'locale') as 'de' | 'en') : 'de';
  const t = await getTranslations({ locale, namespace: 'deals' });
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'tidaq.com';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return requestNewsletter(
    // The sentence next to the checkbox, stored as proof of consent.
    { email: str(form, 'email'), locale, consentText: t('newsletterConsent') },
    `${proto}://${host}`,
  );
}
