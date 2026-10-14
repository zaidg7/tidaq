import { describe, expect, it } from 'vitest';
import { scrubErrorText } from './errorText';

describe('scrubErrorText', () => {
  it('masks addresses and tokens and drops query strings', () => {
    expect(
      scrubErrorText(
        'Supabase 409 on rpc/watch_request: duplicate gast.name+x@example.co.uk (token 3f2a1b4c-1d2e-4f5a-8b9c-0d1e2f3a4b5c) GET /alarm?token=abc&x=1 done',
      ),
    ).toBe('Supabase 409 on rpc/watch_request: duplicate [email] (token [id]) GET /alarm done');
  });

  it('keeps ordinary messages and caps the length', () => {
    expect(scrubErrorText('Supabase 500 for v_stay_public (slug=adlon)')).toBe(
      'Supabase 500 for v_stay_public (slug=adlon)',
    );
    expect(scrubErrorText('x'.repeat(900))).toHaveLength(500);
  });
});
