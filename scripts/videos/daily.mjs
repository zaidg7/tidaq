// Daily videos (C-181): today's two best price drops as ready-to-post vertical videos.
//
//   node scripts/videos/daily.mjs [--out dir] [--fixture file.json] [--no-email]
//
// Reads the drops the radar shows (SQL `radar_drops_priced`, anon key), picks two (exact quote,
// 15–60 %, different cities), renders each with Playwright (template.html) and ffmpeg, writes
// <slug>.mp4, <slug>.jpg (cover) and <slug>.txt (caption) and emails them to VIDEO_TO with Resend.
// Needs SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY (email only). No paid API calls.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const require = createRequire(join(ROOT, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const OUT = resolve(opt('--out') ?? join(ROOT, 'videos-out'));
const FIXTURE = opt('--fixture');
const EMAIL = !args.includes('--no-email');
const TO = process.env.VIDEO_TO ?? 'zaidghazal216@gmail.com';
const FPS = 30;
const SUB = 2;
const TRIP_LENGTHS = [5, 7]; // core DROPS.tripLengths

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

async function rpc(fn, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${fn}`, {
    method: body ? 'POST' : 'GET',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(`Supabase ${res.status} on ${fn}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function loadDrops(today) {
  if (FIXTURE) return JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const rows = (
    await Promise.all(
      TRIP_LENGTHS.map((n) => rpc('rpc/radar_drops_priced', { p_today: today, p_nights: n })),
    )
  ).flat();
  const slugs = [...new Set(rows.map((r) => r.hotel_slug))];
  const credits = slugs.length
    ? await rpc(`hotels?select=slug,image_credit&slug=in.(${slugs.join(',')})`)
    : [];
  const credit = new Map(credits.map((c) => [c.slug, c.image_credit]));
  return rows.map((r) => ({ ...r, image_credit: credit.get(r.hotel_slug) ?? null }));
}

const photoFile = (slug) =>
  [1600, 960]
    .map((w) => join(ROOT, `apps/web/public/hotels/${slug}-${w}.webp`))
    .find((f) => existsSync(f));

/** Two drops: exact quote, a believable size, a photo, different hotels and cities, biggest first. */
export function pick(rows, count = 2) {
  const ok = rows
    .filter(
      (r) =>
        r.quote_nightly_cents && r.drop_pct >= 0.15 && r.drop_pct <= 0.6 && photoFile(r.hotel_slug),
    )
    .sort((a, b) => b.drop_pct - a.drop_pct || b.prev_cents - a.prev_cents);
  const out = [];
  for (const r of ok) {
    if (out.some((o) => o.hotel_slug === r.hotel_slug || o.city_slug === r.city_slug)) continue;
    out.push(r);
    if (out.length === count) break;
  }
  return out;
}

const DAY = 86_400_000;
const nightsOf = (r) => Math.round((Date.parse(r.check_out) - Date.parse(r.night)) / DAY);
function dates(r) {
  const a = new Date(`${r.night}T00:00:00Z`);
  const b = new Date(`${r.check_out}T00:00:00Z`);
  const m = (d) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return m(a) === m(b)
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${m(b)}`
    : `${a.getUTCDate()} ${m(a)} – ${b.getUTCDate()} ${m(b)}`;
}
const eur = (c) => '€' + Math.round(c / 100).toLocaleString('en-US');
const checkedAt = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
const tag = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');

/** What the video and caption say about one drop. Facts only: no urgency, no forecast. */
export function story(r, i) {
  const pct = Math.round(r.drop_pct * 100);
  const n = nightsOf(r);
  const city = r.city_name_en;
  const hooks = [
    [`This 5-star hotel in ${city}`, `is ${pct}% cheaper`, `than yesterday`],
    [`${pct}% off a 5-star hotel`, `in ${city}.`, `Overnight.`],
  ];
  const credit = r.image_credit ? `Photo: ${r.image_credit}` : '';
  const checked = checkedAt(r.quoted_at ?? r.seen_at);
  return {
    data: {
      photo: '',
      chip: 'PRICE DROP · TODAY',
      hook: hooks[i % hooks.length],
      name: r.hotel_name,
      meta: `${dates(r)} · ${n} nights · 2 adults`,
      prevCents: r.prev_cents,
      nowCents: r.now_cents,
      pct,
      foot: `Total incl. taxes on ${r.provider_name} · checked ${checked}`,
      credit,
    },
    caption: [
      `${r.hotel_name} in ${city} is ${pct}% cheaper than yesterday.`,
      `${dates(r)}, ${n} nights, 2 adults: ${eur(r.now_cents)} instead of ${eur(r.prev_cents)} (total incl. taxes on ${r.provider_name}, checked ${checked}). Prices change, check the live price via the link in bio.`,
      ``,
      `Ad: the link in bio is an affiliate link.`,
      `#luxuryhotel #hoteldeals #${tag(city)} #fivestarhotel #travel #pricedrop`,
    ].join('\n'),
    link: `https://tidaq.com/en/price-drops/${r.hotel_slug}/${r.night}--${r.check_out}?ref=tiktok`,
  };
}

function ffmpeg(args, stdin) {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-y', ...args], {
      stdio: [stdin ? 'pipe' : 'ignore', 'inherit', 'inherit'],
    });
    p.on('close', (c) => (c === 0 ? ok(p) : fail(new Error(`ffmpeg exited ${c}`))));
    if (stdin) stdin(p);
  });
}

async function render(browser, data, file) {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  await page.goto(
    `file://${join(HERE, 'template.html')}#${encodeURIComponent(JSON.stringify(data))}`,
  );
  await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);
  const total = Math.round(9 * FPS);
  const done = ffmpeg(
    [
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS * SUB),
      '-i',
      '-',
      '-vf',
      `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB,format=yuv420p`,
      '-r',
      String(FPS),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '19',
      '-profile:v',
      'high',
      '-movflags',
      '+faststart',
      '-an',
      file,
    ],
    async (p) => {
      for (let i = 0; i < total; i++) {
        for (let s = 0; s < SUB; s++) {
          await page.evaluate((t) => window.render(t), (i + (s / SUB) * 0.5) / FPS);
          const shot = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            optimizeForSpeed: true,
          });
          if (!p.stdin.write(Buffer.from(shot.data, 'base64')))
            await new Promise((r) => p.stdin.once('drain', r));
        }
      }
      p.stdin.end();
    },
  );
  await done;
  // Cover: the frame where the price and badge are in place.
  await page.evaluate(() => window.render(3.6));
  await page.screenshot({ path: file.replace(/\.mp4$/, '.jpg'), type: 'jpeg', quality: 90 });
  await page.close();
}

async function email(items, today) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is required to email the videos');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const html = items
    .map(
      (x, i) =>
        `<h2 style="font-family:sans-serif">Video ${i + 1}: ${esc(x.row.hotel_name)}</h2>` +
        `<p style="font-family:sans-serif">Caption (copy and paste):</p>` +
        `<pre style="white-space:pre-wrap;font-family:sans-serif;background:#f4f2f7;padding:12px;border-radius:8px">${esc(x.caption)}</pre>` +
        `<p style="font-family:sans-serif"><a href="${x.link}">Check the drop on tidaq.com</a></p>`,
    )
    .join('<hr>');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'Tidaq Videos <collector@tidaq.com>',
      to: [TO],
      subject: `Today's ${items.length} TikTok videos (${today})`,
      html:
        `<p style="font-family:sans-serif">Post one at 12:30 and one at 19:00. In TikTok: add a trending sound, paste the caption, post. Same file on Instagram Reels.</p>` +
        html,
      attachments: items.flatMap((x) => [
        { filename: `${x.row.hotel_slug}.mp4`, content: readFileSync(x.file).toString('base64') },
      ]),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const today = berlinToday();
  const rows = await loadDrops(today);
  const chosen = pick(rows);
  console.log(
    `drops ${rows.length}, chosen ${chosen.map((r) => `${r.hotel_slug} −${Math.round(r.drop_pct * 100)}%`).join(', ') || 'none'}`,
  );
  if (chosen.length === 0) {
    console.log('No drop qualifies today (exact quote, 15–60 %). Nothing rendered.');
    return;
  }
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const items = [];
  try {
    for (const [i, r] of chosen.entries()) {
      const s = story(r, i);
      s.data.photo = `file://${photoFile(r.hotel_slug)}`;
      const file = join(OUT, `${r.hotel_slug}.mp4`);
      await render(browser, s.data, file);
      writeFileSync(file.replace(/\.mp4$/, '.txt'), `${s.caption}\n\n${s.link}\n`);
      items.push({ row: r, file, caption: s.caption, link: s.link });
      console.log(`rendered ${file}`);
    }
  } finally {
    await browser.close();
  }
  if (EMAIL) {
    await email(items, today);
    console.log(`emailed ${items.length} videos`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
