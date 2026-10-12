/**
 * C-011: resolves the seed hotels (scripts/catalog/seed.json) to Google hotel identifiers with
 * DataForSEO Hotel Searches (one task per hotel, $0.0008 each) and writes
 * scripts/catalog/resolved.json for review. Uncertain matches are printed.
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/catalog/resolve.ts post    # paid: posts the searches
 *   NODE_USE_ENV_PROXY=1 node scripts/catalog/resolve.ts get     # free: fetches and matches
 *   NODE_USE_ENV_PROXY=1 node scripts/catalog/resolve.ts post-retry # paid: unresolved hotels, searched in their own country
 *
 * Budget guard: refuses to post more than MAX_TASKS in total (state file tracks posted tasks).
 * Auth: in cloud sessions the agent proxy adds it; elsewhere set DATAFORSEO_LOGIN/PASSWORD.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.dataforseo.com/v3/business_data/google/hotel_searches';
const MAX_TASKS = 80;
const DIR = dirname(fileURLToPath(import.meta.url));
const STATE = join(DIR, 'resolve-state.json');
const OUT = join(DIR, 'resolved.json');

interface Seed {
  city: string;
  name: string;
  /** Original seed hotel this one replaces (not findable via the API, C-011). */
  replaces?: string;
  /** Fixed task tag when the name changed after the search was posted. */
  tag?: string;
}
interface State {
  posted: { id: string; tag: string }[];
}

/**
 * Search location per city. DataForSEO appends the location name to the keyword ("… Wien, Germany"),
 * which finds nothing for hotels outside Germany, so searches use the hotel's own country.
 * Prices (Hotel Info) are still requested with location Germany (D-39).
 */
const SEARCH_LOCATION: Record<string, number> = {
  berlin: 2276,
  muenchen: 2276,
  hamburg: 2276,
  frankfurt: 2276,
  wien: 2040,
  zuerich: 2756,
  paris: 2250,
  london: 2826,
  mailand: 2380,
  rom: 2380,
  barcelona: 2724,
  amsterdam: 2528,
};

const CITY: Record<string, { label: string; lat: number; lng: number }> = {
  berlin: { label: 'Berlin', lat: 52.52, lng: 13.405 },
  muenchen: { label: 'München', lat: 48.1372, lng: 11.5756 },
  hamburg: { label: 'Hamburg', lat: 53.5511, lng: 9.9937 },
  frankfurt: { label: 'Frankfurt am Main', lat: 50.1109, lng: 8.6821 },
  wien: { label: 'Wien', lat: 48.2082, lng: 16.3738 },
  zuerich: { label: 'Zürich', lat: 47.3769, lng: 8.5417 },
  paris: { label: 'Paris', lat: 48.8566, lng: 2.3522 },
  london: { label: 'London', lat: 51.5074, lng: -0.1278 },
  mailand: { label: 'Mailand', lat: 45.4642, lng: 9.19 },
  rom: { label: 'Rom', lat: 41.9028, lng: 12.4964 },
  barcelona: { label: 'Barcelona', lat: 41.3874, lng: 2.1686 },
  amsterdam: { label: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
};

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  const { DATAFORSEO_LOGIN: login, DATAFORSEO_PASSWORD: password } = process.env;
  if (login && password)
    h.authorization = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
  return h;
}

async function call(path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || json.status_code !== 20000) {
    throw new Error(`${path}: HTTP ${res.status} ${json.status_code} ${json.status_message}`);
  }
  return json;
}

const seeds: Seed[] = JSON.parse(readFileSync(join(DIR, 'seed.json'), 'utf8'));
const tagOf = (s: Seed) => s.tag ?? `catalog-${slugify(`${s.name} ${s.city}`)}`;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `hotel-adlon-kempinski-berlin`: name + city slug, without repeating the city. */
export function hotelSlug(name: string, city: string): string {
  const base = slugify(name);
  const aliases = [city, slugify(CITY[city]?.label ?? city)];
  const english: Record<string, string[]> = {
    muenchen: ['munich'],
    wien: ['vienna'],
    zuerich: ['zurich'],
    mailand: ['milano', 'milan'],
    rom: ['roma', 'rome'],
  };
  const all = [...aliases, ...(english[city] ?? [])];
  return all.some((a) => base.split('-').includes(a)) ? base : `${base}-${city}`;
}

const STOP = new Set(['hotel', 'the', 'and', 'spa', 'a', 'an', 'de', 'le', 'la', 'l', 'by']);
function tokens(value: string): Set<string> {
  return new Set(
    slugify(value)
      .split('-')
      .filter((t) => t && !STOP.has(t)),
  );
}
function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  const inter = [...ta].filter((t) => tb.has(t)).length;
  return inter / Math.max(1, Math.min(ta.size, tb.size));
}
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** Round 3: one city-wide "5-star hotels" search per city that still has unresolved hotels. */
const CITY_QUERY: Record<string, string> = {
  hamburg: '5 Sterne Hotel Hamburg',
  wien: '5 Sterne Hotel Wien',
  mailand: '5 star hotel Milan',
  rom: '5 star hotel Rome',
  barcelona: '5 star hotel Barcelona',
  amsterdam: '5 star hotel Amsterdam',
};

async function postCities(): Promise<void> {
  const state: State = JSON.parse(readFileSync(STATE, 'utf8'));
  const resolved: Resolved[] = JSON.parse(readFileSync(OUT, 'utf8'));
  const cities = [...new Set(resolved.filter((r) => !r.dfsHotelIdentifier).map((r) => r.city))];
  const done = new Set(state.posted.map((p) => p.tag));
  const todo = cities.filter((c) => CITY_QUERY[c] && !done.has(`catalog-city-${c}`));
  if (state.posted.length + todo.length > MAX_TASKS) {
    throw new Error(`Budget guard: ${state.posted.length} posted + ${todo.length} > ${MAX_TASKS}`);
  }
  if (todo.length === 0) return console.log('nothing to post');
  const json = await call(
    '/task_post',
    todo.map((c) => ({
      keyword: CITY_QUERY[c],
      location_code: SEARCH_LOCATION[c],
      language_code: 'de',
      currency: 'EUR',
      adults: 2,
      depth: 36,
      tag: `catalog-city-${c}`,
    })),
  );
  for (const t of json.tasks) {
    if (t.status_code !== 20100)
      throw new Error(`task failed: ${t.status_code} ${t.status_message}`);
    state.posted.push({ id: t.id, tag: t.data.tag });
  }
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`posted ${json.tasks.length} city searches, cost $${json.cost}`);
}

async function post(retry: boolean): Promise<void> {
  const state: State = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { posted: [] };
  const done = new Set(state.posted.map((p) => p.tag));
  let todo: { seed: Seed; tag: string }[];
  if (retry) {
    // Round 2: hotels without an identifier in resolved.json, searched in their own country.
    const resolved: Resolved[] = JSON.parse(readFileSync(OUT, 'utf8'));
    const missing = new Set(resolved.filter((r) => !r.dfsHotelIdentifier).map((r) => r.seedName));
    todo = seeds
      .filter((s) => missing.has(s.name))
      .map((seed) => ({ seed, tag: `${tagOf(seed)}-r2` }))
      .filter((t) => !done.has(t.tag));
  } else {
    todo = seeds.map((seed) => ({ seed, tag: tagOf(seed) })).filter((t) => !done.has(t.tag));
  }
  if (state.posted.length + todo.length > MAX_TASKS) {
    throw new Error(`Budget guard: ${state.posted.length} posted + ${todo.length} > ${MAX_TASKS}`);
  }
  if (todo.length === 0) return console.log('nothing to post');
  const json = await call(
    '/task_post',
    todo.map(({ seed, tag }) => ({
      keyword: seed.name,
      location_code: SEARCH_LOCATION[seed.city],
      language_code: 'de',
      currency: 'EUR',
      adults: 2,
      tag,
    })),
  );
  for (const t of json.tasks) {
    if (t.status_code !== 20100)
      throw new Error(`task failed: ${t.status_code} ${t.status_message}`);
    state.posted.push({ id: t.id, tag: t.data.tag });
  }
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`posted ${json.tasks.length} searches, cost $${json.cost}`);
}

interface Resolved {
  slug: string;
  name: string;
  googleTitle: string | null;
  city: string;
  seedName: string;
  dfsHotelIdentifier: string | null;
  lat: number | null;
  lng: number | null;
  stars: number | null;
  score: number;
  distanceKm: number | null;
  uncertain: boolean;
  candidates: string[];
}

async function get(): Promise<void> {
  const state: State = JSON.parse(readFileSync(STATE, 'utf8'));
  const out: Resolved[] = [];
  // City-wide result lists (round 3), used as extra candidates.
  const cityItems = new Map<string, any[]>();
  for (const p of state.posted.filter((p) => p.tag.startsWith('catalog-city-'))) {
    const json = await call(`/task_get/${p.id}`).catch((e: Error) => ({ error: e.message }));
    const t = json.tasks?.[0];
    if (!t || t.status_code !== 20000) {
      console.log(`${p.tag}: not ready (${t?.status_code ?? json.error})`);
      return;
    }
    cityItems.set(p.tag.replace('catalog-city-', ''), t.result?.[0]?.items ?? []);
  }
  for (const seed of seeds) {
    const task =
      state.posted.find((p) => p.tag === `${tagOf(seed)}-r2`) ??
      state.posted.find((p) => p.tag === tagOf(seed));
    if (!task) throw new Error(`not posted: ${seed.name}`);
    const json = await call(`/task_get/${task.id}`).catch((e: Error) => ({ error: e.message }));
    const t = json.tasks?.[0];
    if (!t || t.status_code !== 20000) {
      console.log(`${seed.name}: not ready (${t?.status_code ?? json.error})`);
      return;
    }
    const items: any[] = [...(t.result?.[0]?.items ?? []), ...(cityItems.get(seed.city) ?? [])];
    const city = CITY[seed.city]!;
    const scored = items
      .filter((i) => i.type === 'hotel_search_item')
      .map((i) => {
        const d =
          i.location?.latitude != null
            ? distanceKm(city.lat, city.lng, i.location.latitude, i.location.longitude)
            : null;
        return { i, score: similarity(seed.name, i.title), d };
      })
      .filter((x) => x.d === null || x.d <= 25)
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    // The same hotel can appear in its own search and in the city list: only a different hotel
    // with the same score makes the match uncertain.
    const second = scored.find((x) => x.i.hotel_identifier !== best?.i.hotel_identifier);
    const uncertain =
      !best || best.score < 0.6 || (second !== undefined && second.score === best.score);
    out.push({
      // Our curated names and slugs; Google titles vary ("Savoy Hotel", "…, a Luxury Collection Hotel").
      slug: hotelSlug(seed.name, seed.city),
      name: seed.name,
      googleTitle: best?.i.title ?? null,
      city: seed.city,
      seedName: seed.name,
      dfsHotelIdentifier: best && best.score >= 0.6 ? best.i.hotel_identifier : null,
      lat: best?.i.location?.latitude ?? null,
      lng: best?.i.location?.longitude ?? null,
      stars: best?.i.stars ?? null,
      score: Math.round((best?.score ?? 0) * 100) / 100,
      distanceKm: best?.d != null ? Math.round(best.d * 10) / 10 : null,
      uncertain,
      candidates: scored
        .slice(0, 3)
        .map((x) => `${x.i.title} (${x.score.toFixed(2)}, ${x.d?.toFixed(1)} km)`),
    });
  }
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  for (const r of out) {
    console.log(
      `${r.uncertain ? '??' : 'ok'} ${r.seedName} → ${r.name} [${r.dfsHotelIdentifier ?? '-'}] ${r.distanceKm} km`,
    );
    if (r.uncertain) console.log(`   candidates: ${r.candidates.join(' | ')}`);
  }
}

const cmd = process.argv[2];
if (cmd === 'post') await post(false);
else if (cmd === 'post-retry') await post(true);
else if (cmd === 'post-cities') await postCities();
else if (cmd === 'get') await get();
else {
  console.error('usage: node scripts/catalog/resolve.ts post|post-retry|get');
  process.exit(1);
}
