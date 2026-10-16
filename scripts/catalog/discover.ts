/**
 * C-071: finds the five-star hotels of the target cities (D-43) and their Tripadvisor keys for
 * the free price source (Xotelo, D-41). Writes scripts/catalog/candidates.json for review.
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/catalog/discover.ts            # all cities
 *   NODE_USE_ENV_PROXY=1 node scripts/catalog/discover.ts dubai paris # some cities
 *
 * Xotelo's city list has no star class, so stars come from LiteAPI's hotel catalog (free, needs
 * the sandbox key: the cloud agent proxy adds it; elsewhere set LITEAPI_KEY). A LiteAPI
 * five-star hotel counts when a Xotelo hotel lies within 250 m with a similar name. Both are
 * read-only catalog calls, about one per second; no prices, no bookings.
 *
 * LiteAPI files some hotels under another place (Four Seasons Abu Dhabi, Emirates Palace), so a
 * Tripadvisor hotel of a known luxury brand counts too (`source: 'brand'`, no LiteAPI id).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'candidates.json');
const UA = 'Tidaq/1.0 (+https://tidaq.com)';
/** Xotelo list pages (100 hotels each, by popularity) read per Tripadvisor location. */
const PAGES = 8;

export interface City {
  slug: string;
  nameDe: string;
  nameEn: string;
  countryCode: string;
  /**
   * Tripadvisor locations (g…); a few cities need neighbours, e.g. Miami Beach. Santa Monica and
   * West Hollywood still miss their ids (C-071b).
   */
  geos: string[];
  /** LiteAPI city names in `countryCode`. */
  liteCities: string[];
  /**
   * Holiday regions with many small towns (C-155: Mallorca, Côte d'Azur, Bali…): LiteAPI's
   * five-star hotels within `radiusKm` of this point instead of by city name.
   */
  area?: { lat: number; lng: number; radiusKm: number };
  /** Xotelo list pages (100 hotels each, by popularity); regions have thousands of hotels. */
  pages?: number;
}

/** The 25 most popular luxury cities (C-071) plus Hamburg and Frankfurt (launch, D-04). */
export const CITIES: City[] = [
  {
    slug: 'berlin',
    nameDe: 'Berlin',
    nameEn: 'Berlin',
    countryCode: 'DE',
    geos: ['g187323'],
    liteCities: ['Berlin'],
  },
  {
    slug: 'muenchen',
    nameDe: 'München',
    nameEn: 'Munich',
    countryCode: 'DE',
    geos: ['g187309'],
    liteCities: ['Munich'],
  },
  {
    slug: 'hamburg',
    nameDe: 'Hamburg',
    nameEn: 'Hamburg',
    countryCode: 'DE',
    geos: ['g187331'],
    liteCities: ['Hamburg'],
  },
  {
    slug: 'frankfurt',
    nameDe: 'Frankfurt am Main',
    nameEn: 'Frankfurt',
    countryCode: 'DE',
    geos: ['g187337'],
    liteCities: ['Frankfurt/Main'],
  },
  {
    slug: 'wien',
    nameDe: 'Wien',
    nameEn: 'Vienna',
    countryCode: 'AT',
    geos: ['g190454'],
    liteCities: ['Vienna'],
  },
  {
    slug: 'zuerich',
    nameDe: 'Zürich',
    nameEn: 'Zurich',
    countryCode: 'CH',
    geos: ['g188113'],
    liteCities: ['Zurich'],
  },
  {
    slug: 'paris',
    nameDe: 'Paris',
    nameEn: 'Paris',
    countryCode: 'FR',
    geos: ['g187147'],
    liteCities: ['Paris'],
  },
  {
    slug: 'london',
    nameDe: 'London',
    nameEn: 'London',
    countryCode: 'GB',
    geos: ['g186338'],
    liteCities: ['London'],
  },
  {
    slug: 'mailand',
    nameDe: 'Mailand',
    nameEn: 'Milan',
    countryCode: 'IT',
    geos: ['g187849'],
    liteCities: ['Milan'],
  },
  {
    slug: 'rom',
    nameDe: 'Rom',
    nameEn: 'Rome',
    countryCode: 'IT',
    geos: ['g187791'],
    liteCities: ['Rome'],
  },
  {
    slug: 'barcelona',
    nameDe: 'Barcelona',
    nameEn: 'Barcelona',
    countryCode: 'ES',
    geos: ['g187497'],
    liteCities: ['Barcelona'],
  },
  {
    slug: 'amsterdam',
    nameDe: 'Amsterdam',
    nameEn: 'Amsterdam',
    countryCode: 'NL',
    geos: ['g188590'],
    liteCities: ['Amsterdam'],
  },
  {
    slug: 'madrid',
    nameDe: 'Madrid',
    nameEn: 'Madrid',
    countryCode: 'ES',
    geos: ['g187514'],
    liteCities: ['Madrid'],
  },
  {
    slug: 'lissabon',
    nameDe: 'Lissabon',
    nameEn: 'Lisbon',
    countryCode: 'PT',
    geos: ['g189158'],
    liteCities: ['Lisbon'],
  },
  {
    slug: 'istanbul',
    nameDe: 'Istanbul',
    nameEn: 'Istanbul',
    countryCode: 'TR',
    geos: ['g293974'],
    liteCities: ['Istanbul'],
  },
  {
    slug: 'dubai',
    nameDe: 'Dubai',
    nameEn: 'Dubai',
    countryCode: 'AE',
    geos: ['g295424'],
    liteCities: ['Dubai'],
  },
  {
    slug: 'abu-dhabi',
    nameDe: 'Abu Dhabi',
    nameEn: 'Abu Dhabi',
    countryCode: 'AE',
    geos: ['g294013'],
    liteCities: ['Abu Dhabi'],
  },
  {
    slug: 'malediven',
    nameDe: 'Malediven',
    nameEn: 'Maldives',
    countryCode: 'MV',
    geos: ['g293953'],
    liteCities: [],
  },
  {
    slug: 'new-york',
    nameDe: 'New York',
    nameEn: 'New York',
    countryCode: 'US',
    geos: ['g60763'],
    liteCities: ['New York'],
  },
  {
    slug: 'miami',
    nameDe: 'Miami',
    nameEn: 'Miami',
    countryCode: 'US',
    geos: ['g34438', 'g34439'],
    liteCities: ['Miami', 'Miami Beach'],
  },
  {
    slug: 'los-angeles',
    nameDe: 'Los Angeles',
    nameEn: 'Los Angeles',
    countryCode: 'US',
    geos: ['g32655', 'g32070'],
    liteCities: ['Los Angeles', 'Beverly Hills'],
  },
  {
    slug: 'singapur',
    nameDe: 'Singapur',
    nameEn: 'Singapore',
    countryCode: 'SG',
    geos: ['g294265'],
    liteCities: ['Singapore'],
  },
  {
    slug: 'bangkok',
    nameDe: 'Bangkok',
    nameEn: 'Bangkok',
    countryCode: 'TH',
    geos: ['g293916'],
    liteCities: ['Bangkok'],
  },
  {
    slug: 'hongkong',
    nameDe: 'Hongkong',
    nameEn: 'Hong Kong',
    countryCode: 'HK',
    geos: ['g294217'],
    liteCities: ['Hong Kong'],
  },
  {
    slug: 'tokio',
    nameDe: 'Tokio',
    nameEn: 'Tokyo',
    countryCode: 'JP',
    geos: ['g298184'],
    liteCities: ['Tokyo'],
  },
  {
    slug: 'shanghai',
    nameDe: 'Shanghai',
    nameEn: 'Shanghai',
    countryCode: 'CN',
    geos: ['g308272'],
    liteCities: ['Shanghai'],
  },
  {
    slug: 'sydney',
    nameDe: 'Sydney',
    nameEn: 'Sydney',
    countryCode: 'AU',
    geos: ['g255060'],
    liteCities: ['Sydney'],
  },
  // C-155: high-travel holiday places (Zaid, 16 Oct: "at least 400-500 five-star hotels,
  // prioritise high travel places"). Tripadvisor ids checked by their hotel lists.
  {
    slug: 'mallorca',
    nameDe: 'Mallorca',
    nameEn: 'Mallorca',
    countryCode: 'ES',
    geos: ['g187462'],
    liteCities: [],
    area: { lat: 39.6, lng: 2.95, radiusKm: 70 },
    pages: 20,
  },
  {
    slug: 'ibiza',
    nameDe: 'Ibiza',
    nameEn: 'Ibiza',
    countryCode: 'ES',
    geos: ['g187460'],
    liteCities: [],
    area: { lat: 38.98, lng: 1.43, radiusKm: 25 },
    pages: 10,
  },
  {
    slug: 'cote-d-azur',
    nameDe: 'Côte d’Azur',
    nameEn: 'French Riviera',
    countryCode: 'FR',
    geos: ['g187216', 'g187242'],
    liteCities: [],
    area: { lat: 43.5, lng: 6.95, radiusKm: 75 },
    pages: 20,
  },
  {
    slug: 'monaco',
    nameDe: 'Monaco',
    nameEn: 'Monaco',
    countryCode: 'MC',
    geos: ['g190409'],
    liteCities: [],
    area: { lat: 43.74, lng: 7.42, radiusKm: 4 },
  },
  {
    slug: 'santorini',
    nameDe: 'Santorini',
    nameEn: 'Santorini',
    countryCode: 'GR',
    geos: ['g189433'],
    liteCities: [],
    area: { lat: 36.4, lng: 25.43, radiusKm: 15 },
    pages: 20,
  },
  {
    slug: 'mykonos',
    nameDe: 'Mykonos',
    nameEn: 'Mykonos',
    countryCode: 'GR',
    geos: ['g189430'],
    liteCities: [],
    area: { lat: 37.45, lng: 25.36, radiusKm: 10 },
    pages: 12,
  },
  {
    slug: 'amalfikueste',
    nameDe: 'Amalfiküste',
    nameEn: 'Amalfi Coast',
    countryCode: 'IT',
    geos: ['g187779'],
    liteCities: [],
    area: { lat: 40.635, lng: 14.55, radiusKm: 12 },
    pages: 18,
  },
  {
    slug: 'capri',
    nameDe: 'Capri',
    nameEn: 'Capri',
    countryCode: 'IT',
    geos: ['g187783'],
    liteCities: [],
    area: { lat: 40.55, lng: 14.23, radiusKm: 6 },
  },
  {
    slug: 'venedig',
    nameDe: 'Venedig',
    nameEn: 'Venice',
    countryCode: 'IT',
    geos: ['g187870'],
    liteCities: [],
    area: { lat: 45.437, lng: 12.335, radiusKm: 8 },
    pages: 17,
  },
  {
    slug: 'florenz',
    nameDe: 'Florenz',
    nameEn: 'Florence',
    countryCode: 'IT',
    geos: ['g187895'],
    liteCities: [],
    area: { lat: 43.77, lng: 11.255, radiusKm: 10 },
    pages: 20,
  },
  {
    slug: 'prag',
    nameDe: 'Prag',
    nameEn: 'Prague',
    countryCode: 'CZ',
    geos: ['g274707'],
    liteCities: [],
    area: { lat: 50.08, lng: 14.42, radiusKm: 15 },
    pages: 20,
  },
  {
    slug: 'budapest',
    nameDe: 'Budapest',
    nameEn: 'Budapest',
    countryCode: 'HU',
    geos: ['g274887'],
    liteCities: [],
    area: { lat: 47.5, lng: 19.05, radiusKm: 15 },
    pages: 20,
  },
  {
    slug: 'zermatt',
    nameDe: 'Zermatt',
    nameEn: 'Zermatt',
    countryCode: 'CH',
    geos: ['g188098'],
    liteCities: [],
    area: { lat: 46.02, lng: 7.75, radiusKm: 6 },
  },
  {
    slug: 'marrakesch',
    nameDe: 'Marrakesch',
    nameEn: 'Marrakech',
    countryCode: 'MA',
    geos: ['g293734'],
    liteCities: [],
    area: { lat: 31.63, lng: -8.0, radiusKm: 25 },
    pages: 20,
  },
  {
    slug: 'bali',
    nameDe: 'Bali',
    nameEn: 'Bali',
    countryCode: 'ID',
    geos: ['g294226'],
    liteCities: [],
    area: { lat: -8.6, lng: 115.2, radiusKm: 60 },
    pages: 32,
  },
  {
    slug: 'phuket',
    nameDe: 'Phuket',
    nameEn: 'Phuket',
    countryCode: 'TH',
    geos: ['g293920'],
    liteCities: [],
    area: { lat: 7.95, lng: 98.33, radiusKm: 35 },
    pages: 30,
  },
  {
    slug: 'doha',
    nameDe: 'Doha',
    nameEn: 'Doha',
    countryCode: 'QA',
    geos: ['g294009'],
    liteCities: [],
    area: { lat: 25.3, lng: 51.5, radiusKm: 25 },
  },
  {
    slug: 'mauritius',
    nameDe: 'Mauritius',
    nameEn: 'Mauritius',
    countryCode: 'MU',
    geos: ['g293816'],
    liteCities: [],
    area: { lat: -20.25, lng: 57.55, radiusKm: 60 },
    pages: 15,
  },
  {
    slug: 'seychellen',
    nameDe: 'Seychellen',
    nameEn: 'Seychelles',
    countryCode: 'SC',
    geos: ['g293738'],
    liteCities: [],
    area: { lat: -4.6, lng: 55.5, radiusKm: 80 },
    pages: 8,
  },
  {
    slug: 'kapstadt',
    nameDe: 'Kapstadt',
    nameEn: 'Cape Town',
    countryCode: 'ZA',
    geos: ['g1722390'],
    liteCities: [],
    area: { lat: -33.95, lng: 18.42, radiusKm: 25 },
    pages: 20,
  },
  {
    slug: 'riviera-maya',
    nameDe: 'Cancún & Riviera Maya',
    nameEn: 'Cancún & Riviera Maya',
    countryCode: 'MX',
    geos: ['g150807', 'g150812', 'g150813'],
    liteCities: [],
    area: { lat: 20.9, lng: -86.95, radiusKm: 110 },
    pages: 14,
  },
];

interface XoteloHotel {
  name: string;
  key: string;
  accommodation_type: string;
  review_summary?: { rating: number; count: number };
  price_ranges?: { minimum: number; maximum: number };
  geo?: { latitude: number; longitude: number };
}

interface LiteHotel {
  id: string;
  name: string;
  stars: number;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  hotelTypeId: number;
  chain: string;
}

export interface Candidate {
  city: string;
  name: string;
  xoteloKey: string;
  /** Null when only the luxury brand qualified it. */
  liteapiId: string | null;
  source: 'liteapi' | 'brand';
  lat: number;
  lng: number;
  /** Tripadvisor rating (of 5) and review count: the popularity rank. */
  taRating: number;
  taReviews: number;
  /** Tripadvisor's typical nightly price range (EUR). */
  priceMin: number | null;
  priceMax: number | null;
  chain: string | null;
  /** Distance between the two catalogs' coordinates (m) and name similarity (0–1). */
  matchMeters: number;
  matchName: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA, ...headers } });
    if (res.ok) return res.json();
    if (attempt >= 2) throw new Error(`${res.status} for ${url.split('?')[0]}`);
    await sleep(3000 * (attempt + 1));
  }
}

async function xoteloList(geo: string, pages = PAGES): Promise<XoteloHotel[]> {
  const out: XoteloHotel[] = [];
  for (let page = 0; page < pages; page++) {
    const data = (await getJson(
      `https://data.xotelo.com/api/list?location_key=${geo}&offset=${page * 100}&limit=100&sort=popularity`,
    )) as { result?: { list?: XoteloHotel[]; total_count?: number } };
    const list = data.result?.list ?? [];
    out.push(...list);
    await sleep(1000);
    if (list.length < 100) break;
  }
  return out;
}

async function liteFiveStar(
  countryCode: string,
  cityName: string | null,
  area?: City['area'],
): Promise<LiteHotel[]> {
  const key = process.env.LITEAPI_KEY;
  const city = area
    ? `&latitude=${area.lat}&longitude=${area.lng}&radius=${area.radiusKm * 1000}`
    : cityName
      ? `&cityName=${encodeURIComponent(cityName)}`
      : '';
  const data = (await getJson(
    `https://api.liteapi.travel/v3.0/data/hotels?countryCode=${countryCode}${city}&starRating=5&limit=1000`,
    key ? { 'x-api-key': key } : {},
  )) as { data?: LiteHotel[] };
  await sleep(500);
  return data.data ?? [];
}

const STOP = new Set(
  'the hotel hotels and by a an of de del la le les el al di da do du das der die resort resorts spa & - , . collection autograph luxury member members leading ihg marriott hilton hyatt accor curio tribute lxr city centre center'.split(
    ' ',
  ),
);

export function tokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

/** Share of the shorter name's words found in the other name. */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  let hit = 0;
  for (const t of small) if (big.has(t)) hit++;
  return hit / small.size;
}

export function meters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Brands whose hotels are five-star (or above) everywhere; the rest needs LiteAPI's stars. */
export const LUXURY_BRAND =
  /\b(four seasons|ritz[- ]carlton|ritz paris|the ritz london|st\.? regis|mandarin oriental|peninsula|rosewood|aman|amanzoe|bulgari|bvlgari|waldorf astoria|park hyatt|raffles|six senses|one ?& ?only|capella|cheval blanc|belmond|dorchester|le bristol|oetker|emirates palace|burj al arab|jumeirah|armani|edition|soneva|banyan tree|anantara|shangri-la|kempinski|fairmont|conrad|the langham|langham|sofitel legend|orient express|rocco forte|aman)\b/i;

/** Apartments and serviced residences are not what "five-star hotel" means to a guest. */
const NOT_A_HOTEL =
  /\b(apartments?|apart|aparthotel|residences?|lofts?|suites? &|villas?|hostel|flats?)\b/i;

export function match(city: string, lite: LiteHotel[], xo: XoteloHotel[]): Candidate[] {
  const out = new Map<string, Candidate>();
  for (const l of lite) {
    if (NOT_A_HOTEL.test(l.name)) continue;
    let best: { x: XoteloHotel; m: number; s: number } | null = null;
    for (const x of xo) {
      if (!x.geo || x.accommodation_type !== 'Hotel' || NOT_A_HOTEL.test(x.name)) continue;
      const m = meters(l.latitude, l.longitude, x.geo.latitude, x.geo.longitude);
      if (m > 250) continue;
      const s = nameSimilarity(l.name, x.name);
      const ok = s >= 0.5 || (s >= 0.34 && m <= 80);
      if (ok && (!best || s > best.s || (s === best.s && m < best.m))) best = { x, m, s };
    }
    if (!best) continue;
    const prev = out.get(best.x.key);
    if (prev && prev.matchName >= best.s) continue;
    out.set(best.x.key, {
      city,
      name: best.x.name,
      xoteloKey: best.x.key,
      liteapiId: l.id,
      source: 'liteapi',
      lat: best.x.geo?.latitude ?? l.latitude,
      lng: best.x.geo?.longitude ?? l.longitude,
      taRating: best.x.review_summary?.rating ?? 0,
      taReviews: best.x.review_summary?.count ?? 0,
      priceMin: best.x.price_ranges?.minimum ?? null,
      priceMax: best.x.price_ranges?.maximum ?? null,
      chain: l.chain && l.chain !== 'Not Available' ? l.chain : null,
      matchMeters: Math.round(best.m),
      matchName: Math.round(best.s * 100) / 100,
    });
  }
  for (const x of xo) {
    if (out.has(x.key) || !x.geo || x.accommodation_type !== 'Hotel') continue;
    if (!LUXURY_BRAND.test(x.name) || NOT_A_HOTEL.test(x.name)) continue;
    out.set(x.key, {
      city,
      name: x.name,
      xoteloKey: x.key,
      liteapiId: null,
      source: 'brand',
      lat: x.geo.latitude,
      lng: x.geo.longitude,
      taRating: x.review_summary?.rating ?? 0,
      taReviews: x.review_summary?.count ?? 0,
      priceMin: x.price_ranges?.minimum ?? null,
      priceMax: x.price_ranges?.maximum ?? null,
      chain: null,
      matchMeters: 0,
      matchName: 0,
    });
  }
  return [...out.values()].sort((a, b) => b.taReviews - a.taReviews);
}

/** One hotel per line: readable diffs between discovery runs. */
function toJson(all: Record<string, Candidate[]>): string {
  const cities = Object.entries(all).map(
    ([slug, list]) => `"${slug}": [\n${list.map((c) => `  ${JSON.stringify(c)}`).join(',\n')}\n]`,
  );
  return `{\n${cities.join(',\n')}\n}\n`;
}

async function main() {
  const only = process.argv.slice(2);
  const all: Record<string, Candidate[]> = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, Candidate[]>)
    : {};
  for (const c of CITIES) {
    if (only.length && !only.includes(c.slug)) continue;
    const lite: LiteHotel[] = [];
    for (const name of c.liteCities.length ? c.liteCities : [null]) {
      lite.push(...(await liteFiveStar(c.countryCode, name, c.area)));
    }
    const xo: XoteloHotel[] = [];
    for (const geo of c.geos) xo.push(...(await xoteloList(geo, c.pages)));
    all[c.slug] = match(c.slug, lite, xo);
    console.log(
      `${c.slug}: ${lite.length} five-star in LiteAPI, ${xo.length} Xotelo hotels read, ${all[c.slug]?.length} matched`,
    );
    writeFileSync(OUT, toJson(all));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
