import { describe, expect, it } from 'vitest';
import { dropOgImageUrl } from './ogImage';

describe('dropOgImageUrl (C-028c)', () => {
  it('points to the og-drop function with the hotel, the stay key and the language', () => {
    expect(
      dropOgImageUrl(
        'https://abc.supabase.co/',
        'hotel-adlon-kempinski-berlin',
        { night: '2026-10-23', checkOut: '2026-10-25' },
        'en',
      ),
    ).toBe(
      'https://abc.supabase.co/functions/v1/og-drop?hotel=hotel-adlon-kempinski-berlin&stay=2026-10-23--2026-10-25&l=en',
    );
    expect(
      dropOgImageUrl(
        'https://abc.supabase.co',
        'x',
        { night: '2026-10-18', checkOut: '2026-10-19' },
        'de',
      ),
    ).toContain('stay=2026-10-18&l=de');
  });

  it('is null without a Supabase URL', () => {
    expect(
      dropOgImageUrl(undefined, 'x', { night: '2026-10-18', checkOut: '2026-10-19' }, 'de'),
    ).toBeNull();
  });
});
