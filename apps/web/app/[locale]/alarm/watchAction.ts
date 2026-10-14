'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { isLocale, parseEuroCents } from '@tidaq/core';
import { requestWatch, type WatchRequestStatus } from '@/lib/watch/watch';

export type WatchFormState =
  | { status: 'idle' }
  | {
      status: WatchRequestStatus | 'rate_limited' | 'bad_price';
      previewUrl?: string;
      /** What was entered, so a failed attempt keeps the form filled (React resets forms). */
      values?: { email: string; target: string; consent: boolean };
    };

/**
 * Per-IP limit for the watch form (C-030b): 5 requests per 10 minutes per Worker isolate. The IP
 * is only a key in memory, never stored or logged. A weak first line until Turnstile (C-030c).
 */
const WINDOW_MS = 10 * 60_000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

/** "Preis beobachten" on the stay page. */
export async function watchAction(_prev: WatchFormState, form: FormData): Promise<WatchFormState> {
  const values = {
    email: str(form, 'email'),
    target: str(form, 'target'),
    consent: form.get('consent') === 'on',
  };
  const result = await submit(form);
  return { ...result, values };
}

async function submit(form: FormData): Promise<Exclude<WatchFormState, { status: 'idle' }>> {
  // Honeypot: people never see this field; bots fill it. Pretend it worked.
  if (str(form, 'website')) return { status: 'sent' };

  const h = await headers();
  const ip = h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (ip && limited(ip)) return { status: 'rate_limited' };

  const locale = isLocale(str(form, 'locale')) ? (str(form, 'locale') as 'de' | 'en') : 'de';
  const priceInput = str(form, 'target');
  const targetCents = priceInput ? parseEuroCents(priceInput) : null;
  if (priceInput && (targetCents === null || targetCents <= 0)) return { status: 'bad_price' };
  if (form.get('consent') !== 'on') return { status: 'invalid' };

  const t = await getTranslations({ locale, namespace: 'stay' });
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'tidaq.com';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');

  return requestWatch(
    {
      email: str(form, 'email'),
      locale,
      hotel: { slug: str(form, 'hotel'), name: str(form, 'hotelName') },
      checkIn: str(form, 'checkIn'),
      checkOut: str(form, 'checkOut'),
      adults: Number(str(form, 'adults')),
      targetCents,
      // The sentence next to the checkbox, stored as proof of consent.
      consentText: t('watchConsent'),
    },
    `${proto}://${host}`,
  );
}
