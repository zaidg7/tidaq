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
