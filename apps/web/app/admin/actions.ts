'use server';

import { redirect } from 'next/navigation';
import {
  findDrop,
  parseDropKey,
  parseEuroCents,
  platformSchema,
  trustOutcome,
  z,
} from '@tidaq/core';
import {
  AUDIT_EXTRAS,
  deleteTest,
  insertTest,
  updateTest,
  uploadScreenshot,
  type AuditExtra,
} from '@/lib/admin/audit';
import { approveProvider, runStagingCollector, setHotelActive } from '@/lib/admin/db';
import { markPosted, unmarkPosted } from '@/lib/admin/posted';
import { requireAdmin } from '@/lib/admin/session';
import { getDrops, getWeek } from '@/lib/data/drops';
import { berlinToday } from '@/lib/today';

/**
 * Admin buttons (C-016) as server actions: Next checks the Origin, `requireAdmin()` checks the
 * session, then the change runs with the service role. Each ends on `/admin?ok=…` or `?fail=…`.
 */

const id = z.coerce.number().int().positive();

async function guarded(
  name: string,
  work: () => Promise<string>,
  page:
    | '/admin'
    | '/admin/audit'
    | '/admin/preisstuerze'
    | '/admin/preisstuerze?zeitraum=woche' = '/admin',
): Promise<never> {
  await requireAdmin(page.split('?')[0] ?? page);
  const join = page.includes('?') ? '&' : '?';
  let target: string;
  try {
    target = `${page}${join}ok=${await work()}`;
  } catch (e) {
    console.error(`[admin] ${name} failed`, (e as Error).message);
    target = `${page}${join}fail=${name}`;
  }
  redirect(target);
}

export async function approveProviderAction(form: FormData) {
  await guarded('provider', async () => {
    await approveProvider(id.parse(form.get('id')));
    return 'provider';
  });
}

export async function deactivateHotelAction(form: FormData) {
  await guarded('hotelOff', async () => {
    await setHotelActive(id.parse(form.get('id')), false);
    return 'hotelOff';
  });
}

export async function activateHotelAction(form: FormData) {
  await guarded('hotelOn', async () => {
    await setHotelActive(id.parse(form.get('id')), true);
    return 'hotelOn';
  });
}

export async function runStagingAction() {
  await guarded('run', async () => {
    const result = await runStagingCollector();
    if (!result.ok) throw new Error(result.error ?? 'run failed');
    return 'run';
  });
}

const auditForm = z.object({
  hotel_id: id,
  provider_id: id,
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(4),
  listed: z.string(),
  checkout: z.string(),
  notes: z.string().max(500),
});

/**
 * Saves a checkout test (C-032): new, or an edit when `test_id` is set. The outcome follows from
 * the two prices; a screenshot goes to the private bucket.
 */
export async function saveAuditTestAction(form: FormData) {
  const editing = form.get('test_id') ? id.parse(form.get('test_id')) : null;
  await guarded(
    editing ? 'auditEdit' : 'audit',
    async () => {
      const f = auditForm.parse({
        hotel_id: form.get('hotel_id'),
        provider_id: form.get('provider_id'),
        check_in: form.get('check_in'),
        check_out: form.get('check_out'),
        adults: form.get('adults') ?? 2,
        listed: form.get('listed') ?? '',
        checkout: form.get('checkout') ?? '',
        notes: form.get('notes') ?? '',
      });
      const extras = form
        .getAll('extras')
        .map(String)
        .filter((e): e is AuditExtra => Object.hasOwn(AUDIT_EXTRAS, e));
      const listed = parseEuroCents(f.listed);
      const notBookable = extras.includes('not_bookable');
      const checkout = notBookable ? null : parseEuroCents(f.checkout);
      if (listed === null || (!notBookable && checkout === null) || f.check_out <= f.check_in) {
        throw new Error('invalid audit input');
      }
      const prices = { listedCents: listed, checkoutCents: checkout };
      const shot = form.get('screenshot');
      const screenshotPath = await uploadScreenshot(shot instanceof File ? shot : null);
      const test = {
        provider_id: f.provider_id,
        hotel_id: f.hotel_id,
        check_in: f.check_in,
        check_out: f.check_out,
        adults: f.adults,
        listed_cents: listed,
        checkout_cents: checkout,
        outcome: trustOutcome(prices),
        extras,
        notes: f.notes.trim() || null,
        screenshot_path: screenshotPath,
      };
      if (editing) await updateTest(editing, test);
      else await insertTest(test);
      return editing ? 'auditEdit' : 'audit';
    },
    '/admin/audit',
  );
}

export async function deleteAuditTestAction(form: FormData) {
  await guarded(
    'auditDelete',
    async () => {
      await deleteTest(id.parse(form.get('id')));
      return 'auditDelete';
    },
    '/admin/audit',
  );
}

const postedForm = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  key: z.string().max(30),
  platform: platformSchema,
  period: z.enum(['day', 'week']),
  on: z.enum(['1', '0']),
});

/**
 * "Gepostet" in the creator kit (C-080j): marks a drop as posted on TikTok or Instagram, or takes
 * the mark back. The drop is looked up again on the server (today's radar or the week), so only
 * real drops get saved, with their current facts.
 */
export async function markPostedAction(form: FormData) {
  const week = form.get('period') === 'week';
  await guarded(
    'posted',
    async () => {
      const f = postedForm.parse({
        slug: form.get('slug'),
        key: form.get('key'),
        platform: form.get('platform'),
        period: form.get('period'),
        on: form.get('on'),
      });
      const today = berlinToday();
      const stay = parseDropKey(f.key);
      const load = f.period === 'week' ? await getWeek(today) : await getDrops(today);
      const groups = load.kind !== 'ok' ? null : 'groups' in load ? load.groups : load.drops;
      if (!stay || !groups) throw new Error('drops unavailable');
      const hit = findDrop(groups, f.slug, stay);
      if (!hit) throw new Error('drop not found');
      if (f.on === '1') await markPosted(hit.group, hit.drop, f.platform, today);
      else await unmarkPosted(hit.group.hotel.id, hit.drop, f.platform);
      return 'posted';
    },
    week ? '/admin/preisstuerze?zeitraum=woche' : '/admin/preisstuerze',
  );
}
