'use server';

import { redirect } from 'next/navigation';
import { isLocale, localizedPath } from '@tidaq/core';
import { dropAlertOff, dropHotelAlertOff } from '@/lib/watch/dropAlerts';
import { newsletterOff } from '@/lib/watch/newsletter';
import { confirmWatch, removeWatch, unsubscribe, WATCH_PATHS } from '@/lib/watch/watch';

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};
const localeOf = (form: FormData) => {
  const l = str(form, 'locale');
  return isLocale(l) ? l : 'de';
};

/** "Alarm bestätigen" (a POST, so mail scanners that open links don't confirm by accident). */
export async function confirmAction(form: FormData) {
  const locale = localeOf(form);
  const manage = await confirmWatch(str(form, 'token')).catch(() => null);
  if (!manage) redirect(`${localizedPath(WATCH_PATHS.confirm, locale)}?ungueltig=1`);
  redirect(`${localizedPath(WATCH_PATHS.manage(manage), locale)}?bestaetigt=1`);
}

export async function removeAction(form: FormData) {
  const locale = localeOf(form);
  const token = str(form, 'token');
  const ok = await removeWatch(token, str(form, 'watch')).catch(() => false);
  redirect(`${localizedPath(WATCH_PATHS.manage(token), locale)}?${ok ? 'beendet' : 'fehler'}=1`);
}

export async function unsubscribeAction(form: FormData) {
  const locale = localeOf(form);
  const token = str(form, 'token');
  const ok = await unsubscribe(token).catch(() => false);
  redirect(`${localizedPath(WATCH_PATHS.manage(token), locale)}?${ok ? 'abgemeldet' : 'fehler'}=1`);
}

/** "Newsletter abbestellen" (C-054a): the newsletter only, price alerts stay. */
export async function newsletterOffAction(form: FormData) {
  const locale = localeOf(form);
  const token = str(form, 'token');
  const ok = await newsletterOff(token).catch(() => false);
  redirect(
    `${localizedPath(WATCH_PATHS.manage(token), locale)}?${ok ? 'newsletter-aus' : 'fehler'}=1`,
  );
}

/** Stops the Preissturz-Alarm only (C-080e1). */
export async function dropAlertOffAction(form: FormData) {
  const locale = localeOf(form);
  const token = str(form, 'token');
  const ok = await dropAlertOff(token).catch(() => false);
  redirect(
    `${localizedPath(WATCH_PATHS.manage(token), locale)}?${ok ? 'preissturz-aus' : 'fehler'}=1`,
  );
}

/** Stops the Preissturz-Alarm for one hotel (C-080k1); the rest stays. */
export async function dropHotelAlertOffAction(form: FormData) {
  const locale = localeOf(form);
  const token = str(form, 'token');
  const ok = await dropHotelAlertOff(token, str(form, 'hotel')).catch(() => false);
  redirect(
    `${localizedPath(WATCH_PATHS.manage(token), locale)}?${ok ? 'preissturz-hotel-aus' : 'fehler'}=1`,
  );
}
