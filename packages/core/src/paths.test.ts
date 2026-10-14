import { describe, expect, it } from 'vitest';
import { alternatesFor, localizedPath, splitLocale } from './paths';

describe('splitLocale', () => {
  it('reads the English prefix', () => {
    expect(splitLocale('/en')).toEqual({ locale: 'en', path: '/' });
    expect(splitLocale('/en/hotels/adlon')).toEqual({ locale: 'en', path: '/hotels/adlon' });
  });

  it('treats unprefixed paths as German', () => {
    expect(splitLocale('/')).toEqual({ locale: 'de', path: '/' });
    expect(splitLocale('/deals')).toEqual({ locale: 'de', path: '/deals' });
    expect(splitLocale('deals')).toEqual({ locale: 'de', path: '/deals' });
  });

  it('does not mistake look-alike segments for a locale', () => {
    expect(splitLocale('/english')).toEqual({ locale: 'de', path: '/english' });
    expect(splitLocale('/deals')).toEqual({ locale: 'de', path: '/deals' });
  });

  it('strips the internal German prefix', () => {
    expect(splitLocale('/de')).toEqual({ locale: 'de', path: '/' });
    expect(splitLocale('/de/hotels')).toEqual({ locale: 'de', path: '/hotels' });
  });
});

describe('localizedPath', () => {
  it('switches between the locales', () => {
    expect(localizedPath('/', 'en')).toBe('/en');
    expect(localizedPath('/en', 'de')).toBe('/');
    expect(localizedPath('/hotels/adlon', 'en')).toBe('/en/hotels/adlon');
    expect(localizedPath('/en/hotels/adlon', 'de')).toBe('/hotels/adlon');
  });

  it('keeps the locale when it is already right', () => {
    expect(localizedPath('/en/deals', 'en')).toBe('/en/deals');
    expect(localizedPath('/deals', 'de')).toBe('/deals');
    expect(localizedPath('/de/deals', 'en')).toBe('/en/deals');
    expect(localizedPath('/de', 'de')).toBe('/');
  });

  it('drops trailing slashes', () => {
    expect(localizedPath('/en/deals/', 'de')).toBe('/deals');
    expect(localizedPath('/deals/', 'en')).toBe('/en/deals');
  });
});

describe('alternatesFor', () => {
  it('gives the canonical URL in the page language and both versions, German as default', () => {
    expect(alternatesFor('/stadt/berlin', 'en')).toEqual({
      canonical: '/en/stadt/berlin',
      languages: { de: '/stadt/berlin', en: '/en/stadt/berlin', 'x-default': '/stadt/berlin' },
    });
    expect(alternatesFor('/en/', 'de')).toEqual({
      canonical: '/',
      languages: { de: '/', en: '/en', 'x-default': '/' },
    });
  });
});
