'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { clientIp, createRateLimiter, isLocale } from '@tidaq/core';
import { verifyTurnstile } from '@/lib/turnstile';
import { HOTEL_PREFIX } from '@/components/drops/alertId';
import { getCatalog } from '@/lib/data/catalog';
import { requestDropAlert, type DropAlertStatus } from '@/lib/watch/dropAlerts';

export type DropAlertFormState =
  | { status: 'idle' }
  | {
      status: DropAlertStatus | 'rate_limited' | 'bot';
      previewUrl?: string;
      /** What was entered, so a failed attempt keeps the form filled (React resets forms). */
      values?: { email: string; consent: boolean; city: string };
    };

/** 5 sign-ups per 10 minutes per IP and Worker isolate (like the watch form, C-030b). */
const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 });

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

/** Preissturz-Alarm sign-up on the radar, drop pages and city pages (C-080e1). */
export async function dropAlertAction(
  _prev: DropAlertFormState,
  form: FormData,
): Promise<DropAlertFormState> {
  const values = {
    email: str(form, 'email'),
    consent: form.get('consent') === 'on',
    city: str(form, 'city'),
  };
  return { ...(await submit(form)), values };
}

async function submit(form: FormData): Promise<Exclude<DropAlertFormState, { status: 'idle' }>> {
  // Honeypot: people never see this field; bots fill it. Pretend it worked.
  if (str(form, 'website')) return { status: 'sent' };
  const h = await headers();
  const ip = clientIp(h);
  if (ip && limiter.limited(ip)) return { status: 'rate_limited' };
  // A person, not a bot (C-030c); off without TURNSTILE_SECRET_KEY.
  if (!(await verifyTurnstile(form, ip))) return { status: 'bot' };
  if (form.get('consent') !== 'on') return { status: 'invalid' };

  const locale = isLocale(str(form, 'locale')) ? (str(form, 'locale') as 'de' | 'en') : 'de';
  const t = await getTranslations({ locale, namespace: 'dropAlert' });
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'tidaq.com';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const city = str(form, 'city');
  // One hotel (C-080k1): its name for the email comes from the catalog, never from the form.
  let hotel: { slug: string; name: string } | null = null;
  if (city.startsWith(HOTEL_PREFIX)) {
    const slug = city.slice(HOTEL_PREFIX.length);
    const catalog = await getCatalog();
    if (!catalog) return { status: 'error' };
    const found = catalog.hotels.find((x) => x.slug === slug);
    if (!found) return { status: 'invalid' };
    hotel = { slug: found.slug, name: found.name };
  }
  return requestDropAlert(
    // The sentence next to the checkbox, stored as proof of consent.
    {
      email: str(form, 'email'),
      locale,
      consentText: t('consent'),
      city: hotel ? null : city || null,
      hotel,
    },
    `${proto}://${host}`,
  );
}
