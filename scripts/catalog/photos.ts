/**
 * C-011b: finds a freely licensed photo for each catalog hotel and prints JSON to stdout.
 *
 *   node scripts/catalog/photos.ts [hotels.json] > scripts/catalog/photos.json
 *
 * Source: the hotel's Wikidata item (matched by name and coordinates within 1 km of our
 * catalog position) and its curated image (property P18) on Wikimedia Commons. Only CC BY,
 * CC BY-SA, CC0 and public-domain files are accepted. Never Google, Booking or hotel press photos.
 *
 * Runs in GitHub Actions (workflow "Catalog photos"): Wikimedia rate-limits the shared IP of the
 * Claude cloud sessions (429 on the first request, 12 Oct 2026).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const UA = 'TidaqCatalogBot/0.1 (https://tidaq.com; hotel photo licensing check)';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const MAX_DISTANCE_KM = 1;
/** Hotels whose Wikidata image was checked and rejected by hand (slug → reason). */
const REJECTED: Record<string, string> = {
  'sofitel-frankfurt-opera': 'photo shows the building before the hotel opened',
};
const THUMB_WIDTH = 1280;

interface Resolved {
  slug: string;
  name: string;
  googleTitle?: string;
  city: string;
  lat: number | null;
  lng: number | null;
}

export interface Photo {
  slug: string;
  wikidata: string | null;
  file: string | null;
  imageUrl: string | null;
  credit: string | null;
  license: string | null;
  pageUrl: string | null;
  note: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Wikimedia API JSON is read loosely: only a few fields are used, each checked before use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJson(base: string, params: Record<string, string>): Promise<any> {
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(2000 * 2 ** attempt);
  }
  throw new Error(`gave up after retries: ${url}`);
}

export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** `cc-by-sa-4.0`, `cc-by-2.0`, `cc0`, `pd`, `public domain` → allowed; NC/ND and anything else → not. */
export function allowedLicense(code: string): boolean {
  const c = code.trim().toLowerCase();
  if (/(^|-)n[cd](-|$)/.test(c)) return false;
  return (
    /^cc-by(-sa)?(-\d(\.\d)?)?/.test(c) ||
    c === 'cc0' ||
    c.startsWith('pd') ||
    c === 'public domain'
  );
}

/** extmetadata Artist is HTML; keep the visible text. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s*talk\s*\)/gi, '')
    .replace(/\s+,/g, ',')
    .trim();
}

/** Thumbnail URL without Wikimedia's tracking parameters; only Wikimedia upload hosts. */
export function cleanImageUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(u.hostname)) return null;
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !['hotel', 'the', 'and'].includes(w)),
  );

/** Share of the hotel's name words that appear in the label (0..1). */
export function nameScore(hotel: string, label: string): number {
  const h = words(hotel);
  if (h.size === 0) return 0;
  const l = words(label);
  return [...h].filter((w) => l.has(w)).length / h.size;
}

async function findPhoto(h: Resolved): Promise<Photo> {
  const none = (note: string, wikidata: string | null = null): Photo => ({
    slug: h.slug,
    wikidata,
    file: null,
    imageUrl: null,
    credit: null,
    license: null,
    pageUrl: null,
    note,
  });
  if (h.lat === null || h.lng === null) return none('no coordinates');
  if (REJECTED[h.slug]) return none(`rejected by hand: ${REJECTED[h.slug]}`);

  const ids = new Set<string>();
  for (const search of new Set([h.name, h.googleTitle ?? h.name])) {
    for (const language of ['en', 'de']) {
      const r = await getJson(WIKIDATA, {
        action: 'wbsearchentities',
        search,
        language,
        type: 'item',
        limit: '7',
      });
      for (const s of r.search ?? []) ids.add(s.id);
    }
  }
  if (ids.size === 0) return none('no Wikidata match');

  const ents = await getJson(WIKIDATA, {
    action: 'wbgetentities',
    ids: [...ids].slice(0, 50).join('|'),
    props: 'claims|labels',
    languages: 'en|de',
  });
  let best: { id: string; file: string; km: number; score: number } | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose API JSON, see getJson
  for (const e of Object.values<any>(ents.entities ?? {})) {
    const coord = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    const file = e.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!coord || !file) continue;
    const km = distanceKm([h.lat, h.lng], [coord.latitude, coord.longitude]);
    const label = `${e.labels?.en?.value ?? ''} ${e.labels?.de?.value ?? ''}`;
    const score = nameScore(h.name, label);
    if (km > MAX_DISTANCE_KM || score < 0.5) continue;
    if (!best || score > best.score || (score === best.score && km < best.km)) {
      best = { id: e.id, file, km, score };
    }
  }
  if (!best) return none(`no item with image within ${MAX_DISTANCE_KM} km and a matching name`);

  const info = await getJson(COMMONS, {
    action: 'query',
    titles: `File:${best.file}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
  });
  const ii = info.query?.pages?.[0]?.imageinfo?.[0];
  const meta = ii?.extmetadata ?? {};
  const licenseCode: string = meta.License?.value ?? '';
  const licenseName: string = plainText(meta.LicenseShortName?.value ?? licenseCode);
  const imageUrl = ii?.thumburl ? cleanImageUrl(ii.thumburl) : null;
  if (!imageUrl) return none('Commons file not found', best.id);
  if (!allowedLicense(licenseCode))
    return none(`license not allowed: ${licenseName || 'unknown'}`, best.id);
  const artist = plainText(meta.Artist?.value ?? '');
  const isPd = /^(cc0|pd|public domain)/i.test(licenseCode);
  if (!artist && !isPd) return none('no author for an attribution license', best.id);

  return {
    slug: h.slug,
    wikidata: best.id,
    file: best.file,
    imageUrl,
    credit: `Foto: ${artist || 'unbekannt'}, ${licenseName}, via Wikimedia Commons`,
    license: licenseName,
    pageUrl: ii.descriptionurl ?? null,
    note: `${best.km.toFixed(2)} km, name score ${best.score.toFixed(2)}`,
  };
}

async function main() {
  // Default: the launch catalog; C-071 batches pass their own list ([{ slug, name, city, lat, lng }]).
  const input = process.argv[2] ?? join(DIR, 'resolved.json');
  const hotels: Resolved[] = JSON.parse(readFileSync(input, 'utf8'));
  const out: Photo[] = [];
  for (const h of hotels) {
    try {
      out.push(await findPhoto(h));
    } catch (err) {
      out.push({
        slug: h.slug,
        wikidata: null,
        file: null,
        imageUrl: null,
        credit: null,
        license: null,
        pageUrl: null,
        note: `error: ${String(err)}`,
      });
    }
    await sleep(500);
  }
  console.log(JSON.stringify(out, null, 2));
  const found = out.filter((p) => p.imageUrl).length;
  console.error(`${found} of ${out.length} hotels have a licensed photo.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
