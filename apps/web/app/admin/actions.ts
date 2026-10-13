'use server';

import { redirect } from 'next/navigation';
import { z } from '@tidaq/core';
import { approveProvider, runStagingCollector, setHotelActive } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';

/**
 * Admin buttons (C-016) as server actions: Next checks the Origin, `requireAdmin()` checks the
 * session, then the change runs with the service role. Each ends on `/admin?ok=…` or `?fail=…`.
 */

const id = z.coerce.number().int().positive();

async function guarded(name: string, work: () => Promise<string>): Promise<never> {
  await requireAdmin('/admin');
  let target: string;
  try {
    target = `/admin?ok=${await work()}`;
  } catch (e) {
    console.error(`[admin] ${name} failed`, (e as Error).message);
    target = `/admin?fail=${name}`;
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
