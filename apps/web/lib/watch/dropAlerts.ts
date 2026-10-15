import 'server-only';
import { getTranslations } from 'next-intl/server';
import { localizedPath, renderMail, z, type Locale } from '@tidaq/core';
import { hasServiceRole, serviceRest } from '@/lib/admin/db';
import { reportError } from '@/lib/errors';
import { mailIsLive, sendMail } from '@/lib/mail';
import { isUuid, WATCH_PATHS } from './watch';

/**
 * Preissturz-Alarm sign-up (C-080e1): drops in one city or in all of them, at most one email a
 * day (sent by the collector, C-080e2). It shares the price-alert address like the newsletter:
 * the same double opt-in link (`watch_confirm`), the same manage page and the same one-click
 * unsubscribe. SQL `drop_alert_request` / `drop_alert_off`, service role only. Never logs an
 * address.
 */

const requestResult = z.object({
  status: z.enum(['ok', 'invalid', 'too_soon']),
  email_kind: z.enum(['confirm', 'added', 'already']).optional(),
  confirm_token: z.string().uuid().optional(),
  manage_token: z.string().uuid().optional(),
});

export type DropAlertStatus = 'sent' | 'added' | 'invalid' | 'too_soon' | 'error';

export interface DropAlertResult {
  status: DropAlertStatus;
  /** Dry runs only (staging, local): the email's link, to test without mail. */
  previewUrl?: string;
}

export async function requestDropAlert(
  req: { email: string; locale: Locale; consentText: string; city: string | null },
  origin: string,
): Promise<DropAlertResult> {
  if (!hasServiceRole()) return { status: 'error' };
  try {
    const r = await serviceRest('rpc/drop_alert_request', requestResult, {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        p_email: req.email,
        p_locale: req.locale,
        p_consent_text: req.consentText,
        p_city: req.city,
      },
    });
    if (r.status !== 'ok' || !r.confirm_token || !r.manage_token) {
      return { status: r.status === 'ok' ? 'error' : r.status };
    }
    const manageUrl = origin + localizedPath(WATCH_PATHS.manage(r.manage_token), req.locale);
    // Same choice as before and confirmed: nothing new to tell, and no extra email to send.
    if (r.email_kind === 'already') return { status: 'added' };

    const t = await getTranslations({ locale: req.locale, namespace: 'dropAlertMail' });
    const confirm = r.email_kind === 'confirm';
    const confirmUrl = `${origin}${localizedPath(WATCH_PATHS.confirm, req.locale)}?token=${r.confirm_token}`;
    const footer = [t('footerWhy'), t('footerManage', { url: manageUrl })];
    const mail = renderMail(
      confirm
        ? {
            preheader: t('confirmPreheader'),
            heading: t('confirmHeading'),
            paragraphs: [t('confirmText'), t('what'), t('confirmIgnore')],
            button: { label: t('confirmButton'), url: confirmUrl },
            footer,
          }
        : {
            preheader: t('addedPreheader'),
            heading: t('addedHeading'),
            paragraphs: [t('addedText'), t('what')],
            button: { label: t('manageButton'), url: manageUrl },
            footer,
          },
    );
    const ok = await sendMail({
      to: req.email,
      subject: confirm ? t('confirmSubject') : t('addedSubject'),
      kind: confirm ? 'drops_confirm' : 'drops_added',
      unsubscribeUrl: origin + WATCH_PATHS.unsubscribe(r.manage_token),
      ...mail,
    });
    if (!ok) return { status: 'error' };
    return {
      status: confirm ? 'sent' : 'added',
      ...(!mailIsLive() && { previewUrl: confirm ? confirmUrl : manageUrl }),
    };
  } catch (error) {
    reportError('drop alert request failed', error);
    return { status: 'error' };
  }
}

/** Stops the Preissturz-Alarm only; price alerts and the newsletter stay. */
export async function dropAlertOff(token: string): Promise<boolean> {
  if (!hasServiceRole() || !isUuid(token)) return false;
  return serviceRest('rpc/drop_alert_off', z.boolean(), {
    method: 'POST',
    prefer: 'return=representation',
    body: { p_token: token },
  });
}
