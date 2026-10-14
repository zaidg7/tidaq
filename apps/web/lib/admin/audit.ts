import 'server-only';
import { providerScore, z } from '@tidaq/core';
import { serviceRest, serviceStorage } from './db';

/**
 * Checkout audit data (C-032): manual tests of "listed price" (the provider's price on our stay
 * page or Tripadvisor since C-032c; Google Hotels before 15 Oct 2026) vs "total at the
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
  screenshot_path: z.string().nullable(),
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
    `trust_tests?select=${TEST_SELECT}&order=tested_at.desc&limit=${limit}`,
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
  screenshot_path?: string | null;
}

export async function insertTest(test: NewAuditTest) {
  await serviceRest('trust_tests', null, { method: 'POST', body: test });
  await recomputeScore(test.provider_id);
}

const TEST_SELECT =
  'id,provider_id,hotel_id,check_in,check_out,adults,listed_cents,checkout_cents,outcome,extras,notes,screenshot_path,tested_at,providers(name),hotels(name)';

export async function getTest(testId: number): Promise<AuditTest | null> {
  const rows = await serviceRest(
    `trust_tests?id=eq.${testId}&select=${TEST_SELECT}`,
    z.array(testSchema),
  );
  return rows[0] ?? null;
}

/** Saves an edited test; recomputes the old and (if changed) the new provider's score. */
export async function updateTest(testId: number, test: NewAuditTest) {
  const before = await getTest(testId);
  if (!before) throw new Error(`trust test ${testId} not found`);
  const patch: Partial<NewAuditTest> = { ...test };
  // Keep the stored screenshot unless a new one was uploaded.
  if (!test.screenshot_path) delete patch.screenshot_path;
  await serviceRest(`trust_tests?id=eq.${testId}`, null, { method: 'PATCH', body: patch });
  if (test.screenshot_path && before.screenshot_path)
    await removeScreenshot(before.screenshot_path);
  await recomputeScore(test.provider_id);
  if (before.provider_id !== test.provider_id) await recomputeScore(before.provider_id);
}

export async function deleteTest(testId: number) {
  const before = await getTest(testId);
  if (!before) return;
  await serviceRest(`trust_tests?id=eq.${testId}`, null, { method: 'DELETE' });
  if (before.screenshot_path) await removeScreenshot(before.screenshot_path);
  await recomputeScore(before.provider_id);
}

export const SCREENSHOT_BUCKET = 'audit-screenshots';
const SCREENSHOT_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

/** Stores a checkout screenshot privately; returns its path, or null for an empty field. */
export async function uploadScreenshot(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = SCREENSHOT_TYPES[file.type];
  if (!ext) throw new Error(`screenshot type ${file.type} not allowed`);
  if (file.size > SCREENSHOT_MAX_BYTES) throw new Error('screenshot too large');
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  await serviceStorage(`object/${SCREENSHOT_BUCKET}/${path}`, {
    method: 'POST',
    body: file,
    contentType: file.type,
  });
  return path;
}

async function removeScreenshot(path: string) {
  await serviceStorage(`object/${SCREENSHOT_BUCKET}/${path}`, { method: 'DELETE' }).catch((e) =>
    console.error('[admin] screenshot delete failed', (e as Error).message),
  );
}

/** A link to a private screenshot that works for 5 minutes. */
export async function signedScreenshotUrl(path: string): Promise<string> {
  // Storage answers with a path relative to /storage/v1.
  const data = z.object({ signedURL: z.string().startsWith('/') }).parse(
    await serviceStorage(`object/sign/${SCREENSHOT_BUCKET}/${path}`, {
      method: 'POST',
      body: JSON.stringify({ expiresIn: 300 }),
      contentType: 'application/json',
    }),
  );
  const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  return `${base}/storage/v1${data.signedURL}`;
}

export async function allTests(): Promise<AuditTest[]> {
  return serviceRest(`trust_tests?select=${TEST_SELECT}&order=tested_at.desc`, z.array(testSchema));
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
