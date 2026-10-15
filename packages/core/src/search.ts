/**
 * Hotel search for the homepage combobox (C-021): accent- and case-insensitive, word-prefix
 * matching on hotel and city names. "zurich", "zuerich" and "Zürich" all find Zürich.
 */

export interface SearchableHotel {
  slug: string;
  name: string;
  /** City name in the page language. */
  city: string;
}

/** Lowercase, accents removed, ß → ss, punctuation → spaces. */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

/** German umlaut spellings typed without umlauts: "zuerich" → "zurich". */
function transliterated(folded: string): string {
  return folded.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}

function words(folded: string): string[] {
  return folded.split(' ').filter(Boolean);
}

/** Every query word starts a word of the text (in any order). */
function prefixMatch(queryWords: string[], textWords: string[]): boolean {
  return queryWords.every((q) => textWords.some((w) => w.startsWith(q)));
}

/**
 * The query names this city ("zuer", "zurich", "new y" for New York): every query word starts a
 * word of the city. Empty queries never match.
 */
export function matchesCity(query: string, city: string): boolean {
  const raw = foldText(query);
  if (!raw) return false;
  const cityWords = words(foldText(city));
  return [raw, transliterated(raw)].some((q) => prefixMatch(words(q), cityWords));
}

/**
 * Hotels that match `query`, best first: name starts with the query, then a name word matches,
 * then the city matches, then any substring. An empty query returns all hotels by city and name.
 */
export function matchHotels<H extends SearchableHotel>(query: string, hotels: readonly H[]): H[] {
  const byCityName = (a: H, b: H) =>
    a.city.localeCompare(b.city, 'de') || a.name.localeCompare(b.name, 'de');
  const raw = foldText(query);
  if (!raw) return [...hotels].sort(byCityName);
  const variants = [...new Set([raw, transliterated(raw)])];

  const scored: { hotel: H; score: number }[] = [];
  for (const hotel of hotels) {
    const name = foldText(hotel.name);
    const city = foldText(hotel.city);
    const nameWords = words(name);
    const allWords = [...nameWords, ...words(city)];
    let best = Infinity;
    for (const q of variants) {
      const qWords = words(q);
      if (name.startsWith(q)) best = Math.min(best, 0);
      else if (prefixMatch(qWords, nameWords)) best = Math.min(best, 1);
      else if (prefixMatch(qWords, words(city))) best = Math.min(best, 2);
      else if (prefixMatch(qWords, allWords)) best = Math.min(best, 3);
      else if (name.includes(q) || city.includes(q)) best = Math.min(best, 4);
    }
    if (best < Infinity) scored.push({ hotel, score: best });
  }
  return scored
    .sort((a, b) => a.score - b.score || byCityName(a.hotel, b.hotel))
    .map((s) => s.hotel);
}

/** Cities whose name the query starts ("ber" → Berlin, "new y" → New York), by name. */
export function matchCities<C extends { name: string }>(query: string, cities: readonly C[]): C[] {
  return cities
    .filter((c) => matchesCity(query, c.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** `text` folded char by char like `foldText` (without trimming), with each char's source index. */
function foldWithMap(text: string): { folded: string; at: number[] } {
  let folded = '';
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? '';
    let f = ch
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ß/g, 'ss')
      .toLowerCase();
    f = /^[\p{Letter}\p{Number}]+$/u.test(f) ? f : ' ';
    for (const c of f) {
      folded += c;
      at.push(i);
    }
  }
  return { folded, at };
}

/**
 * Where the query shows up in `text`, to highlight it: `[start, end)` in `text`, or null.
 * Accent-insensitive like the search ("zur" marks "Zür" in "Zürich", "zuer" too). A match at
 * a word start wins over one inside a word; without a match for the whole query, each of its
 * words is tried ("berlin adlon" marks "Adlon" in a hotel name).
 */
export function highlightRange(text: string, query: string): [number, number] | null {
  const raw = foldText(query);
  if (!raw) return null;
  const { folded, at } = foldWithMap(text);
  const tries = [...new Set([raw, ...words(raw)].flatMap((q) => [q, transliterated(q)]))];
  for (const q of tries) {
    let found = -1;
    for (let pos = folded.indexOf(q); pos !== -1; pos = folded.indexOf(q, pos + 1)) {
      if (pos === 0 || folded[pos - 1] === ' ') {
        found = pos;
        break;
      }
      if (found === -1) found = pos;
    }
    if (found !== -1) {
      const start = at[found] ?? 0;
      const end = (at[found + q.length - 1] ?? start) + 1;
      return [start, end];
    }
  }
  return null;
}
