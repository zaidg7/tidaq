'use server';

import { redirect } from 'next/navigation';
import { isLocale, localizedPath } from '@tidaq/core';
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
