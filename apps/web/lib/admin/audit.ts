import 'server-only';
import { providerScore, z } from '@tidaq/core';
import { serviceRest } from './db';

/**
 * Checkout audit data (C-032): manual tests of "listed on Google Hotels" vs "total at the
 * checkout", and the provider scores computed from them. Service role, after requireAdmin().
 */

export const AUDIT_EXTRAS = {
  city_tax: 'Citytax extra',
  breakfast_missing: 'Frühstück fehlt',
  other_room: 'Anderes Zimmer',
  fees: 'Gebühren',
  not_bookable: 'Nicht buchbar',
} as const;
export type AuditExtra = keyof typeof AUDIT_EXTRAS;

const id = z.coerce.number().int();

const optionSchema = z.object({ id, name: z.string() });

const testSchema = z.object({
  id,
  provider_id: id,
  hotel_id: id,
  check_in: z.string(),
  check_out: z.string(),
  adults: id,
  listed_cents: id,
  checkout_cents: id.nullable(),
  outcome: z.string(),
  extras: z.array(z.string()),
  notes: z.string().nullable(),
  tested_at: z.string(),
  providers: z.object({ name: z.string() }).nullable(),
  hotels: z.object({ name: z.string() }).nullable(),
});
export type AuditTest = z.infer<typeof testSchema>;

export async function auditOptions() {
  const [hotels, providers] = await Promise.all([
    serviceRest('hotels?select=id,name&active=eq.true&order=name', z.array(optionSchema)),
    serviceRest('providers?select=id,name&order=name', z.array(optionSchema)),
  ]);
  return { hotels, providers };
}

export async function recentTests(limit = 20): Promise<AuditTest[]> {
  return serviceRest(
    `trust_tests?select=id,provider_id,hotel_id,check_in,check_out,adults,listed_cents,checkout_cents,outcome,extras,notes,tested_at,providers(name),hotels(name)&order=tested_at.desc&limit=${limit}`,
    z.array(testSchema),
  );
}

export async function testCount(): Promise<number> {
  const rows = await serviceRest('trust_tests?select=id', z.array(z.object({ id })));
  return rows.length;
}

export interface NewAuditTest {
  provider_id: number;
  hotel_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  listed_cents: number;
  checkout_cents: number | null;
  outcome: string;
  extras: AuditExtra[];
  notes: string | null;
}

export async function insertTest(test: NewAuditTest) {
  await serviceRest('trust_tests', null, { method: 'POST', body: test });
  await recomputeScore(test.provider_id);
}

export async function deleteTest(testId: number) {
  const rows = await serviceRest(
    `trust_tests?id=eq.${testId}&select=provider_id`,
    z.array(z.object({ provider_id: id })),
  );
  const providerId = rows[0]?.provider_id;
  if (providerId === undefined) return;
  await serviceRest(`trust_tests?id=eq.${testId}`, null, { method: 'DELETE' });
  await recomputeScore(providerId);
}

/** Recomputes one provider's score from all its tests (PLAN §8.2) and stores it. */
export async function recomputeScore(providerId: number) {
  const tests = await serviceRest(
    `trust_tests?provider_id=eq.${providerId}&select=listed_cents,checkout_cents`,
    z.array(z.object({ listed_cents: id, checkout_cents: id.nullable() })),
  );
  const score = providerScore(
    tests.map((t) => ({ listedCents: t.listed_cents, checkoutCents: t.checkout_cents })),
  );
  if (!score) {
    await serviceRest(`provider_scores?provider_id=eq.${providerId}`, null, { method: 'DELETE' });
    return;
  }
  await serviceRest('provider_scores?on_conflict=provider_id', null, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      provider_id: providerId,
      updated_at: new Date().toISOString(),
      tests: score.tests,
      matches: score.matches,
      avg_markup_pct: score.avgMarkupPct,
      score: score.score,
    },
  });
}
