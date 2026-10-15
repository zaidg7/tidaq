/**
 * C-104: collects freely licensed photo candidates for every hotel from Wikimedia Commons and
 * renders one contact sheet per city, so a session can pick the best photo by eye.
 *
 *   node scripts/photos/candidates.ts [hotels.json] [outDir]
 *
 * Sources per hotel (PREMIUM.md §7.1): the hotel's Wikidata item (name + within 1 km) with its
 * image (P18) and its Commons category (P373, plus one level of subcategories); a Commons
 * full-text search for the hotel name; Commons files geotagged within 150 m whose title names
 * the hotel. Only CC0 / public domain / CC BY / CC BY-SA, at least 1000 px wide, no maps, logos
 * or plans. Writes `candidates.json` and `sheets/<city>.jpg` into outDir.
 *
 * Runs in GitHub Actions (workflow "Catalog photos", mode `candidates`): Wikimedia rate-limits
 * the Claude cloud sessions' IP.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allowedLicense,
  cleanImageUrl,
  distanceKm,
  nameScore,
  plainText,
} from '../catalog/photos.ts';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..', '..');
const UA = 'TidaqCatalogBot/0.2 (https://tidaq.com; hotel photo licensing check)';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const MAX_PER_HOTEL = 10;
const MIN_WIDTH = 1000;
/** Wikimedia serves only standard thumbnail widths. */
const SHEET_THUMB = 330;
const SKIP =
  /(logo|map|karte|plan|grundriss|schild|signage|sign\b|menu|coat of arms|wappen|ticket|receipt|award|\.svg|\.pdf|\.tif)/i;
const GOOD =
  /(night|dusk|evening|blue hour|abend|nacht|pool|terrace|terrasse|lobby|facade|fassade|exterior|aerial|entrance|eingang|suite|room|zimmer)/i;
const POOR =
  /(construction|baustelle|bau\b|demolition|abriss|toilet|bathroom|corridor|kitchen|staff|press conference|protest)/i;

interface Hotel {
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export interface Candidate {
  title: string;
  source: 'p18' | 'category' | 'search' | 'geo';
  width: number;
  height: number;
  thumbUrl: string;
  pageUrl: string;
  license: string;
  credit: string;
  score: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Wikimedia API JSON is read loosely: only a few fields are used, each checked before use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJson(base: string, params: Record<string, string>): Promise<any> {
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(3000 * 2 ** attempt);
  }
  throw new Error(`gave up after retries: ${url}`);
}

/** Score a candidate: where it came from, size, shape and what its title says. */
export function scoreCandidate(c: {
  source: Candidate['source'];
  width: number;
  height: number;
  text: string;
  nameMatch: number;
}): number {
  let s = { p18: 4, category: 2.5, search: 1.5, geo: 1 }[c.source];
  s += c.nameMatch * 2;
  if (c.width >= 2000) s += 1;
  const ratio = c.width / c.height;
  if (ratio >= 1.2 && ratio <= 2) s += 0.8;
  else if (ratio < 0.8) s -= 0.3;
  if (GOOD.test(c.text)) s += 0.7;
  if (POOR.test(c.text)) s -= 2;
  return Math.round(s * 100) / 100;
}

async function wikidataItem(h: Hotel): Promise<{ p18?: string; category?: string } | null> {
  const ids = new Set<string>();
  for (const language of ['en', 'de']) {
    const r = await getJson(WIKIDATA, {
      action: 'wbsearchentities',
      search: h.name,
      language,
      type: 'item',
      limit: '7',
    });
    for (const s of r.search ?? []) ids.add(s.id);
  }
  if (ids.size === 0) return null;
  const ents = await getJson(WIKIDATA, {
    action: 'wbgetentities',
    ids: [...ids].join('|'),
    props: 'claims|labels',
    languages: 'en|de',
  });
  let best: { p18?: string; category?: string; score: number; km: number } | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose API JSON, see getJson
  for (const e of Object.values<any>(ents.entities ?? {})) {
    const coord = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    if (!coord) continue;
    const km = distanceKm([h.lat, h.lng], [coord.latitude, coord.longitude]);
    const label = `${e.labels?.en?.value ?? ''} ${e.labels?.de?.value ?? ''}`;
    const score = nameScore(h.name, label);
    if (km > 1 || score < 0.5) continue;
    if (!best || score > best.score || (score === best.score && km < best.km)) {
      best = {
        p18: e.claims?.P18?.[0]?.mainsnak?.datavalue?.value,
        category: e.claims?.P373?.[0]?.mainsnak?.datavalue?.value,
        score,
        km,
      };
    }
  }
  return best;
}

async function categoryFiles(category: string): Promise<string[]> {
  const files: string[] = [];
  const cats = [category];
  const sub = await getJson(COMMONS, {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'subcat',
    cmlimit: '6',
  });
  for (const m of sub.query?.categorymembers ?? []) cats.push(String(m.title).slice(9));
  for (const c of cats) {
    const r = await getJson(COMMONS, {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${c}`,
      cmtype: 'file',
      cmlimit: '40',
    });
    for (const m of r.query?.categorymembers ?? []) files.push(m.title);
    await sleep(300);
  }
  return files;
}

async function searchFiles(h: Hotel): Promise<string[]> {
  const r = await getJson(COMMONS, {
    action: 'query',
    list: 'search',
    srsearch: `"${h.name.replace(/"/g, '')}"`,
    srnamespace: '6',
    srlimit: '30',
  });
  return (r.query?.search ?? []).map((s: { title: string }) => s.title);
}

async function geoFiles(h: Hotel): Promise<string[]> {
  const r = await getJson(COMMONS, {
    action: 'query',
    list: 'geosearch',
    gscoord: `${h.lat}|${h.lng}`,
    gsradius: '150',
    gsnamespace: '6',
    gslimit: '50',
  });
  return (r.query?.geosearch ?? [])
    .map((g: { title: string }) => g.title)
    .filter((t: string) => nameScore(h.name, t) >= 0.5);
}

async function describe(titles: Map<string, Candidate['source']>, h: Hotel): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const all = [...titles.keys()];
  for (let i = 0; i < all.length; i += 40) {
    const batch = all.slice(i, i + 40);
    const r = await getJson(COMMONS, {
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: String(SHEET_THUMB),
    });
    for (const p of r.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const meta = ii.extmetadata ?? {};
      const licenseCode: string = meta.License?.value ?? '';
      const license = plainText(meta.LicenseShortName?.value ?? licenseCode);
      const artist = plainText(meta.Artist?.value ?? '');
      const isPd = /^(cc0|pd|public domain)/i.test(licenseCode);
      const desc = plainText(meta.ImageDescription?.value ?? '').slice(0, 300);
      const text = `${p.title} ${desc}`;
      if (!/^image\/(jpeg|png|webp)$/.test(ii.mime ?? '')) continue;
      if (!allowedLicense(licenseCode) || (!artist && !isPd)) continue;
      if ((ii.width ?? 0) < MIN_WIDTH || SKIP.test(p.title)) continue;
      const thumbUrl = ii.thumburl ? cleanImageUrl(ii.thumburl) : null;
      if (!thumbUrl) continue;
      const source = titles.get(p.title) ?? 'search';
      out.push({
        title: p.title,
        source,
        width: ii.width,
        height: ii.height,
        thumbUrl,
        pageUrl: ii.descriptionurl,
        license,
        credit: `Foto: ${artist || 'unbekannt'}, ${license}, via Wikimedia Commons`,
        score: scoreCandidate({
          source,
          width: ii.width,
          height: ii.height,
          text,
          nameMatch: nameScore(h.name, text),
        }),
      });
    }
    await sleep(400);
  }
  return out.sort((a, b) => b.score - a.score).slice(0, MAX_PER_HOTEL);
}

async function candidatesFor(h: Hotel): Promise<{ notes: string[]; candidates: Candidate[] }> {
  const notes: string[] = [];
  const titles = new Map<string, Candidate['source']>();
  const add = (list: string[], source: Candidate['source']) => {
    for (const t of list) if (!titles.has(t)) titles.set(t, source);
  };
  const item = await wikidataItem(h).catch((e) => (notes.push(`wikidata: ${e}`), null));
  if (item?.p18) add([`File:${item.p18}`], 'p18');
  if (item?.category)
    add(
      await categoryFiles(item.category).catch((e) => (notes.push(`category: ${e}`), [])),
      'category',
    );
  add(await searchFiles(h).catch((e) => (notes.push(`search: ${e}`), [])), 'search');
  add(await geoFiles(h).catch((e) => (notes.push(`geo: ${e}`), [])), 'geo');
  notes.push(
    `wikidata ${item ? 'yes' : 'no'}, category ${item?.category ?? '–'}, ${titles.size} files looked at`,
  );
  return { notes, candidates: titles.size ? await describe(titles, h) : [] };
}

/** One JPEG per city: a row per hotel with its numbered candidates. */
async function renderSheets(
  results: { hotel: Hotel; candidates: Candidate[] }[],
  outDir: string,
): Promise<void> {
  const webRequire = createRequire(join(ROOT, 'apps/web/package.json'));
  const sharp = createRequire(webRequire.resolve('next/package.json'))('sharp');
  const W = 220;
  const H = 150;
  const LABEL = 30;
  const COLS = MAX_PER_HOTEL;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const byCity = new Map<string, typeof results>();
  for (const r of results) byCity.set(r.hotel.city, [...(byCity.get(r.hotel.city) ?? []), r]);
  mkdirSync(join(outDir, 'sheets'), { recursive: true });
  for (const [city, rows] of byCity) {
    const width = COLS * W;
    const height = rows.length * (H + LABEL + 12);
    const layers: { input: Buffer; left: number; top: number }[] = [];
    let top = 0;
    for (const { hotel, candidates } of rows) {
      const label = `${hotel.slug} · ${candidates.length} Kandidaten`;
      layers.push({
        input: Buffer.from(
          `<svg width="${width}" height="${LABEL}"><text x="6" y="21" font-family="sans-serif" font-size="17" font-weight="700" fill="#15131c">${esc(label)}</text></svg>`,
        ),
        left: 0,
        top,
      });
      for (const [i, c] of candidates.entries()) {
        try {
          const res = await fetch(c.thumbUrl, { headers: { 'user-agent': UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const img = await sharp(Buffer.from(await res.arrayBuffer()))
            .resize(W - 6, H, { fit: 'cover' })
            .jpeg({ quality: 72 })
            .toBuffer();
          layers.push({ input: img, left: i * W, top: top + LABEL });
        } catch {
          // a missing thumbnail leaves its cell empty; the number still shows below
        }
        layers.push({
          input: Buffer.from(
            `<svg width="34" height="24"><rect width="34" height="24" rx="6" fill="#15131c"/><text x="17" y="17" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#fff">${i + 1}</text></svg>`,
          ),
          left: i * W + 4,
          top: top + LABEL + 4,
        });
        await sleep(150);
      }
      top += H + LABEL + 12;
    }
    const file = join(outDir, 'sheets', `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`);
    await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
      .composite(layers)
      .jpeg({ quality: 70 })
      .toFile(file);
    console.error(`sheet ${file}`);
  }
}

async function main() {
  const input = process.argv[2] ?? join(DIR, 'hotels.json');
  const outDir = process.argv[3] ?? DIR;
  const hotels: Hotel[] = JSON.parse(readFileSync(input, 'utf8'));
  const results: { hotel: Hotel; notes: string[]; candidates: Candidate[] }[] = [];
  for (const hotel of hotels) {
    const r = await candidatesFor(hotel).catch((e) => ({
      notes: [`error: ${e}`],
      candidates: [] as Candidate[],
    }));
    results.push({ hotel, ...r });
    console.error(`${hotel.slug}: ${r.candidates.length} (${r.notes.join('; ')})`);
    await sleep(500);
  }
  writeFileSync(
    join(outDir, 'candidates.json'),
    JSON.stringify(
      results.map((r) => ({ slug: r.hotel.slug, notes: r.notes, candidates: r.candidates })),
      null,
      1,
    ) + '\n',
  );
  await renderSheets(results, outDir);
  const covered = results.filter((r) => r.candidates.length > 0).length;
  console.error(`${covered} of ${results.length} hotels have at least one candidate.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
