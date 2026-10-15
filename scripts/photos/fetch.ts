/**
 * C-104: downloads the picked hotel photos (scripts/photos/picks.json) from Wikimedia Commons and
 * writes the delivery files: `apps/web/public/hotels/<slug>-{160,480,960,1600}.webp`, each fitted
 * inside a square of that size, plus a 24 px blur placeholder (LQIP), the focal point and the
 * credit in `apps/web/lib/hotelPhotos.generated.ts`. Also writes `scripts/photos/picked.json`
 * (slug, Commons URL, credit, source page) for the database migration.
 *
 *   node scripts/photos/fetch.ts
 *
 * picks.json: [{ "slug": "…", "file": "File:….jpg", "focus": "50% 40%" }] (focus optional).
 * Runs in GitHub Actions (workflow "Catalog photos", mode `fetch`), like candidates.ts.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { allowedLicense, cleanImageUrl, plainText } from '../catalog/photos.ts';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..', '..');
const UA = 'TidaqPhotoCopy/1.1 (https://tidaq.com; one-time copy of licensed photos)';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIDTHS = [160, 480, 960, 1600] as const;
/** Wikimedia serves standard thumbnail widths; 2560 is enough for the 1600 file. */
const SOURCE_WIDTH = 2560;
/** The URL stored in the database (OG cards, emails read it): a 1280 px Commons thumbnail. */
const DB_WIDTH = 1280;

interface Pick {
  slug: string;
  file: string;
  focus?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose Wikimedia API JSON
async function getJson(params: Record<string, string>): Promise<any> {
  const url = `${COMMONS}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(3000 * 2 ** attempt);
  }
  throw new Error(`gave up after retries: ${url}`);
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(3000 * 2 ** attempt);
  }
  throw new Error(`gave up after retries: ${url}`);
}

/** Commons thumbnail URL of the given standard width (or the original when it's smaller). */
async function fileInfo(file: string, width: number) {
  const r = await getJson({
    action: 'query',
    titles: file,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: String(width),
  });
  const ii = r.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) throw new Error(`${file}: not found on Commons`);
  return ii;
}

async function main() {
  const webRequire = createRequire(join(ROOT, 'apps/web/package.json'));
  const sharp = createRequire(webRequire.resolve('next/package.json'))('sharp');
  const picks: Pick[] = JSON.parse(readFileSync(join(DIR, 'picks.json'), 'utf8'));
  const outDir = join(ROOT, 'apps/web/public/hotels');
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(ROOT, 'apps/web/lib/hotelPhotos.generated.ts');
  const { HOTEL_PHOTOS } = await import(pathToFileURL(manifestPath).href);
  const manifest: Record<string, unknown> = { ...HOTEL_PHOTOS };
  const picked: Record<string, string | null>[] = [];

  for (const pick of picks) {
    if (!/^[a-z0-9-]+$/.test(pick.slug)) throw new Error(`bad slug ${pick.slug}`);
    const ii = await fileInfo(pick.file, SOURCE_WIDTH);
    const meta = ii.extmetadata ?? {};
    const licenseCode: string = meta.License?.value ?? '';
    const license = plainText(meta.LicenseShortName?.value ?? licenseCode);
    const artist = plainText(meta.Artist?.value ?? '');
    const isPd = /^(cc0|pd|public domain)/i.test(licenseCode);
    if (!allowedLicense(licenseCode) || (!artist && !isPd)) {
      throw new Error(`${pick.slug}: ${pick.file} has license "${license}" without usable credit`);
    }
    const source = await download(ii.thumburl ?? ii.url);
    const entry: Record<string, unknown> = {};
    for (const width of WIDTHS) {
      const { data, info } = await sharp(source)
        .rotate()
        .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: width <= 160 ? 70 : width >= 1600 ? 68 : 72 })
        .toBuffer({ resolveWithObject: true });
      writeFileSync(join(outDir, `${pick.slug}-${width}.webp`), data);
      entry[width] = {
        src: `/hotels/${pick.slug}-${width}.webp`,
        width: info.width,
        height: info.height,
      };
    }
    const lqip = await sharp(source)
      .rotate()
      .resize({ width: 24, height: 24, fit: 'inside' })
      .webp({ quality: 40 })
      .toBuffer();
    entry.lqip = `data:image/webp;base64,${lqip.toString('base64')}`;
    if (pick.focus) entry.focus = pick.focus;
    manifest[pick.slug] = entry;

    const db = await fileInfo(pick.file, DB_WIDTH);
    picked.push({
      slug: pick.slug,
      file: pick.file.replace(/^File:/, ''),
      imageUrl: cleanImageUrl(db.thumburl ?? db.url),
      credit: `Foto: ${artist || 'unbekannt'}, ${license}, via Wikimedia Commons`,
      pageUrl: ii.descriptionurl ?? null,
    });
    console.error(`${pick.slug}: ${(entry[1600] as { width: number }).width}px, ${license}`);
    await sleep(600);
  }

  const body = Object.entries(manifest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, e]) => `  '${slug}': ${JSON.stringify(e)},`)
    .join('\n');
  writeFileSync(
    manifestPath,
    `// Generated by scripts/photos/fetch.ts (C-104) and self-host.mjs (C-011c). Do not edit by hand.\nimport type { HotelPhoto } from './hotelPhotos';\n\nexport const HOTEL_PHOTOS: Record<string, HotelPhoto> = {\n${body}\n};\n`,
  );
  writeFileSync(join(DIR, 'picked.json'), JSON.stringify(picked, null, 1) + '\n');
  console.error(`${picked.length} photos written.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
