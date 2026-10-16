/**
 * Matches one of our hotels to a Google Hotels search result (C-153), so the collector can store
 * the right `hotel_identifier` without a person checking it: same place (≤ 1.5 km) and mostly the
 * same name, or very close (≤ 300 m) with a fair share of the name. A wrong id would quote another
 * hotel's price, so anything less certain is no match.
 */

export interface MatchTarget {
  name: string;
  lat: number;
  lng: number;
}

export interface SearchCandidate {
  id: string;
  title: string;
  lat: number | null;
  lng: number | null;
}

export interface MatchResult {
  id: string;
  title: string;
  meters: number;
  /** Share of the result's name words found in ours (0–1). */
  overlap: number;
}

/** Words that say nothing about which hotel it is. */
const STOP = new Set(
  'the hotel hotels and a an at by of de del la le les el di da das der die resort resorts spa & collection autograph luxury leading member'.split(
    ' ',
  ),
);

export function nameWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      // Letters NFD can't split into a base letter and an accent (Çırağan, Øster, Straße).
      .replace(/ı/g, 'i')
      .replace(/ø/g, 'o')
      .replace(/ł/g, 'l')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 0 && !STOP.has(w)),
  );
}

/** Great-circle distance in metres. */
export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** The first search result that is clearly our hotel, else null. Results keep Google's order. */
export function matchHotelSearch(
  target: MatchTarget,
  candidates: readonly SearchCandidate[],
): MatchResult | null {
  const ours = nameWords(target.name);
  for (const c of candidates) {
    if (c.lat === null || c.lng === null) continue;
    const theirs = nameWords(c.title);
    if (theirs.size === 0) continue;
    let hit = 0;
    for (const w of theirs) if (ours.has(w)) hit++;
    const overlap = hit / theirs.size;
    const meters = metersBetween(target.lat, target.lng, c.lat, c.lng);
    if ((overlap >= 0.5 && meters <= 1500) || (overlap >= 0.34 && meters <= 300)) {
      return { id: c.id, title: c.title, meters: Math.round(meters), overlap };
    }
  }
  return null;
}

/** DataForSEO location code of a country: Google's geo target id, 2000 + ISO 3166 numeric. */
const ISO_NUMERIC: Record<string, number> = {
  AE: 784,
  AT: 40,
  AU: 36,
  CH: 756,
  CN: 156,
  CZ: 203,
  DE: 276,
  ES: 724,
  FR: 250,
  GB: 826,
  GR: 300,
  HK: 344,
  HU: 348,
  ID: 360,
  IT: 380,
  JP: 392,
  MA: 504,
  MC: 492,
  MU: 480,
  MV: 462,
  MX: 484,
  NL: 528,
  PT: 620,
  QA: 634,
  SC: 690,
  SG: 702,
  TH: 764,
  TR: 792,
  US: 840,
  ZA: 710,
};

export function dfsLocationCode(countryCode: string): number | null {
  const n = ISO_NUMERIC[countryCode.toUpperCase()];
  return n === undefined ? null : 2000 + n;
}
