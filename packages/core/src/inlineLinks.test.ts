import { describe, expect, it } from 'vitest';
import { inlineLinks } from './inlineLinks';

describe('inlineLinks', () => {
  it('splits text into plain and link parts', () => {
    expect(inlineLinks('Schreib an [mail@tidaq.com](mailto:mail@tidaq.com), danke.')).toEqual([
      { text: 'Schreib an ' },
      { text: 'mail@tidaq.com', href: 'mailto:mail@tidaq.com' },
      { text: ', danke.' },
    ]);
    expect(inlineLinks('[Ranking](/ranking) und [ULD](https://www.datenschutzzentrum.de)')).toEqual(
      [
        { text: 'Ranking', href: '/ranking' },
        { text: ' und ' },
        { text: 'ULD', href: 'https://www.datenschutzzentrum.de' },
      ],
    );
  });

  it('keeps unsafe or protocol-relative targets as plain text', () => {
    expect(inlineLinks('[x](javascript:alert(1)) [y](//evil.example) [z](http://a.de)')).toEqual([
      { text: '[x](javascript:alert(1)) [y](//evil.example) [z](http://a.de)' },
    ]);
  });

  it('returns one empty part for an empty string', () => {
    expect(inlineLinks('')).toEqual([{ text: '' }]);
    expect(inlineLinks('Kein Link.')).toEqual([{ text: 'Kein Link.' }]);
  });
});
