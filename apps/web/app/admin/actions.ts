'use server';

import { redirect } from 'next/navigation';
import { parseEuroCents, trustOutcome, z } from '@tidaq/core';
import { AUDIT_EXTRAS, deleteTest, insertTest, type AuditExtra } from '@/lib/admin/audit';
import { approveProvider, runStagingCollector, setHotelActive } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';

/**
 * Admin buttons (C-016) as server actions: Next checks the Origin, `requireAdmin()` checks the
 * session, then the change runs with the service role. Each ends on `/admin?ok=…` or `?fail=…`.
 */

const id = z.coerce.number().int().positive();

async function guarded(
  name: string,
  work: () => Promise<string>,
  page: '/admin' | '/admin/audit' = '/admin',
): Promise<never> {
  await requireAdmin(page);
  let target: string;
  try {
    target = `${page}?ok=${await work()}`;
  } catch (e) {
    console.error(`[admin] ${name} failed`, (e as Error).message);
    target = `${page}?fail=${name}`;
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

/** One checkout test (C-032). The outcome follows from the two prices. */
export async function saveAuditTestAction(form: FormData) {
  await guarded(
    'audit',
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
        .filter((e): e is AuditExtra => e in AUDIT_EXTRAS);
      const listed = parseEuroCents(f.listed);
      const notBookable = extras.includes('not_bookable');
      const checkout = notBookable ? null : parseEuroCents(f.checkout);
      if (listed === null || (!notBookable && checkout === null) || f.check_out <= f.check_in) {
        throw new Error('invalid audit input');
      }
      const prices = { listedCents: listed, checkoutCents: checkout };
      await insertTest({
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
      });
      return 'audit';
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
