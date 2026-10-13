import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes semicolon rows with a BOM and CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, null],
      ]),
    ).toBe('\ufeffa;b\r\n1;\r\n');
  });

  it('quotes separators, quotes and line breaks', () => {
    expect(toCsv([['x;y', 'sagt "hallo"', 'zwei\nZeilen']])).toBe(
      '\ufeff"x;y";"sagt ""hallo""";"zwei\nZeilen"\r\n',
    );
  });

  it('keeps umlauts and defuses formulas', () => {
    expect(toCsv([['Frühstück', '=HYPERLINK("x")', '-5', -5]])).toBe(
      '\ufeffFrühstück;"\'=HYPERLINK(""x"")";\'-5;-5\r\n',
    );
  });
});
