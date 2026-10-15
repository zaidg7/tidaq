import 'server-only';
import { providerFactsSchema, type ProviderFacts } from '@tidaq/core';
import { hasSupabase, rpc } from './supabase';
import { reportError } from '@/lib/errors';

export type ProviderFactsLoad =
  | { kind: 'ok'; facts: ProviderFacts }
  /** No database (CI, local without env) or the read failed: pages show their fallback. */
  | { kind: 'unavailable' };

/**
 * Public provider facts (C-034, SQL `provider_facts`): today's night grid per reviewed provider
 * and the aggregates of our checkout tests. One call serves the provider pages and /methodik.
 */
export async function getProviderFacts(): Promise<ProviderFactsLoad> {
  if (!hasSupabase()) return { kind: 'unavailable' };
  try {
    return { kind: 'ok', facts: await rpc('provider_facts', {}, providerFactsSchema) };
  } catch (error) {
    reportError('provider facts failed', error);
    return { kind: 'unavailable' };
  }
}
