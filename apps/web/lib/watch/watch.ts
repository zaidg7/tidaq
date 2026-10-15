import 'server-only';
import { getTranslations } from 'next-intl/server';
import {
  formatDateRange,
  formatPrice,
  localizedPath,
  renderMail,
  z,
  type Locale,
} from '@tidaq/core';
import { hasServiceRole, serviceRest } from '@/lib/admin/db';
import { mailIsLive, sendMail } from '@/lib/mail';
import { reportError } from '@/lib/errors';

/**
 * Price-alert watches (C-030): double opt-in, one-click manage and unsubscribe, no login. The
 * SQL functions run with the service role only (`watch_*`, migration `20261014220754_watch_flow`); this file
 * adds the emails. Never logs an address.
 */

export const WATCH_PATHS = {
  confirm: '/alarm/bestaetigen',
  manage: (token: string) => `/alarm/verwalten/${token}`,
  /** One-click unsubscribe (RFC 8058), outside the locale routes. */
  unsubscribe: (token: string) => `/api/watch/unsubscribe?token=${token}`,
};

const requestResult = z.object({
  status: z.enum(['ok', 'invalid', 'too_many', 'too_soon']),
  email_kind: z.enum(['confirm', 'added']).optional(),
  confirm_token: z.string().uuid().optional(),
  manage_token: z.string().uuid().optional(),
  locale: z.enum(['de', 'en']).optional(),
});

export interface WatchRequest {
  email: string;
  locale: Locale;
  hotel: { slug: string; name: string };
  checkIn: string;
  checkOut: string;
  adults: number;
  targetCents: number | null;
  /** The exact consent sentence the visitor saw next to the checkbox. */
  consentText: string;
}

export type WatchRequestStatus = 'sent' | 'added' | 'invalid' | 'too_many' | 'too_soon' | 'error';

export interface WatchRequestResult {
  status: WatchRequestStatus;
  /**
   * Dry runs only (staging, local): the link the email would contain, so the flow can be tested
   * without sending mail. Never set in production.
   */
  previewUrl?: string;
}

/** Creates the watch and sends the confirmation (new address) or "added" email. */
export async function requestWatch(req: WatchRequest, origin: string): Promise<WatchRequestResult> {
  if (!hasServiceRole()) return { status: 'error' };
  try {
    const r = await serviceRest('rpc/watch_request', requestResult, {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        p_email: req.email,
        p_locale: req.locale,
        p_hotel_slug: req.hotel.slug,
        p_check_in: req.checkIn,
        p_check_out: req.checkOut,
        p_adults: req.adults,
        p_target_cents: req.targetCents,
        p_consent_text: req.consentText,
      },
    });
    if (r.status !== 'ok' || !r.confirm_token || !r.manage_token) {
      return { status: r.status === 'ok' ? 'error' : r.status };
    }
    const t = await getTranslations({ locale: req.locale, namespace: 'watchMail' });
    const dates = formatDateRange(req.checkIn, req.checkOut, req.locale);
    const target = req.targetCents ? formatPrice(req.targetCents, req.locale) : null;
    const stay = t('stay', { hotel: req.hotel.name, dates, adults: req.adults });
    const manageUrl = origin + localizedPath(WATCH_PATHS.manage(r.manage_token), req.locale);
    const footer = [t('footerWhy'), t('footerManage', { url: manageUrl })];
    const confirm = r.email_kind === 'confirm';
    const confirmUrl = `${origin}${localizedPath(WATCH_PATHS.confirm, req.locale)}?token=${r.confirm_token}`;
    const mail = renderMail(
      confirm
        ? {
            preheader: t('confirmPreheader'),
            heading: t('confirmHeading'),
            paragraphs: [
              t('confirmText', { stay }),
              target ? t('targetText', { target }) : t('noTargetText'),
              t('confirmIgnore'),
            ],
            button: { label: t('confirmButton'), url: confirmUrl },
            footer,
          }
        : {
            preheader: t('addedPreheader'),
            heading: t('addedHeading'),
            paragraphs: [
              t('addedText', { stay }),
              target ? t('targetText', { target }) : t('noTargetText'),
            ],
            button: { label: t('manageButton'), url: manageUrl },
            footer,
          },
    );
    const ok = await sendMail({
      to: req.email,
      subject: confirm ? t('confirmSubject') : t('addedSubject', { hotel: req.hotel.name }),
      kind: confirm ? 'watch_confirm' : 'watch_added',
      unsubscribeUrl: origin + WATCH_PATHS.unsubscribe(r.manage_token),
      ...mail,
    });
    if (!ok) return { status: 'error' };
    return {
      status: confirm ? 'sent' : 'added',
      ...(!mailIsLive() && { previewUrl: confirm ? confirmUrl : manageUrl }),
    };
  } catch (error) {
    reportError('watch request failed', error);
    return { status: 'error' };
  }
}

const confirmResult = z
  .object({ manage_token: z.string().uuid(), locale: z.enum(['de', 'en']) })
  .nullable();

/** Confirms from the email link. The manage token, or null for an unknown or expired link. */
export async function confirmWatch(token: string): Promise<string | null> {
  if (!hasServiceRole() || !isUuid(token)) return null;
  const r = await serviceRest('rpc/watch_confirm', confirmResult, {
    method: 'POST',
    prefer: 'return=representation',
    body: { p_token: token },
  });
  return r?.manage_token ?? null;
}

const manageResult = z
  .object({
    email: z.string(),
    locale: z.enum(['de', 'en']),
    confirmed: z.boolean(),
    /** Weekly deals newsletter on (C-054a). */
    newsletter: z.boolean().default(false),
    /** Preissturz-Alarm on, and its city (null = all cities) (C-080e1). */
    drop_alerts: z.boolean().default(false),
    drop_city: z
      .object({ slug: z.string(), name_de: z.string(), name_en: z.string() })
      .nullable()
      .default(null),
    watches: z.array(
      z.object({
        id: z.string().uuid(),
        hotel_slug: z.string(),
        hotel_name: z.string(),
        check_in: z.string(),
        check_out: z.string(),
        adults: z.number(),
        target_cents: z.number().nullable(),
      }),
    ),
  })
  .nullable();

export type ManageData = NonNullable<z.infer<typeof manageResult>>;

export async function getManage(token: string): Promise<ManageData | null> {
  if (!hasServiceRole() || !isUuid(token)) return null;
  return serviceRest('rpc/watch_manage', manageResult, {
    method: 'POST',
    prefer: 'return=representation',
    body: { p_token: token },
  });
}

export async function removeWatch(token: string, watchId: string): Promise<boolean> {
  if (!hasServiceRole() || !isUuid(token) || !isUuid(watchId)) return false;
  return serviceRest('rpc/watch_remove', z.boolean(), {
    method: 'POST',
    prefer: 'return=representation',
    body: { p_token: token, p_watch_id: watchId },
  });
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!hasServiceRole() || !isUuid(token)) return false;
  return serviceRest('rpc/watch_unsubscribe', z.boolean(), {
    method: 'POST',
    prefer: 'return=representation',
    body: { p_token: token },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);
