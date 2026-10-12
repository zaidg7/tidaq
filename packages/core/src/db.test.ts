import { describe, expect, expectTypeOf, it } from 'vitest';
import { stayOrigins, stayStates, trustOutcomes, type Hotel, type StayStats } from './db';
import type { Database } from './db.types';

describe('db types', () => {
  it('match the schema check constraints', () => {
    expect(stayStates).toEqual(['collecting', 'near_low', 'good', 'normal', 'high']);
    expect(stayOrigins).toEqual(['grid', 'watch', 'manual']);
    expect(trustOutcomes).toEqual(['match', 'higher', 'lower', 'unavailable']);
  });

  it('expose generated row types', () => {
    expectTypeOf<Hotel['slug']>().toEqualTypeOf<string>();
    expectTypeOf<Hotel['dfs_hotel_identifier']>().toEqualTypeOf<string | null>();
    expectTypeOf<StayStats['now_cents']>().toEqualTypeOf<number | null>();
    expectTypeOf<
      Database['public']['Functions']['prune_raw_snapshots']['Returns']
    >().toEqualTypeOf<number>();
  });
});
