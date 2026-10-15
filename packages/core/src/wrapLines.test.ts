import { describe, expect, it } from 'vitest';
import { wrapLines } from './wrapLines';

/** One unit per character. */
const m = (s: string) => s.length;

describe('wrapLines', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines(m, 'Baur au Lac', 20, 2)).toEqual(['Baur au Lac']);
  });

  it('breaks between words', () => {
    expect(wrapLines(m, 'Four Seasons Hotel George V', 14, 2)).toEqual([
      'Four Seasons',
      'Hotel George V',
    ]);
  });

  it('cuts after the last allowed line with an ellipsis that fits', () => {
    const lines = wrapLines(m, 'The Ritz-Carlton Hotel Berlin am Potsdamer Platz', 16, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith('…')).toBe(true);
    expect(lines.every((l) => l.length <= 16)).toBe(true);
  });

  it('keeps a single word longer than the width on its own line', () => {
    expect(wrapLines(m, 'Hotel Bayerischerhofmünchen', 10, 2)).toEqual([
      'Hotel',
      'Bayerischerhofmünchen',
    ]);
  });

  it('handles empty text', () => {
    expect(wrapLines(m, '   ', 10, 2)).toEqual([]);
  });
});
