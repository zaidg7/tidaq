// C-028c: link-preview image for a price drop (WhatsApp, iMessage, X, Instagram DMs), 1200×630.
// Runs as a Supabase Edge Function (Pro plan: 2 s CPU per call, included calls) so the website's
// Worker stays on Cloudflare's free plan (B-017). Public (no JWT): crawlers fetch it. It reads the
// drop itself from today's radar (anon RPCs), so nobody can make an image with made-up numbers;
// unknown or finished drops get a plain Tidaq card. Facts only, no urgency (CLAUDE.md rule 8).
import React from 'https://esm.sh/react@18.2.0';
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.4/mod.ts';
import UPNG from 'npm:upng-js@2.1.0';
import jpeg from 'npm:jpeg-js@0.4.4';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY = /^\d{4}-\d{2}-\d{2}(--\d{4}-\d{2}-\d{2})?$/;

type Row = {
  hotel_slug: string;
  hotel_name: string;
  city_name_de: string;
  city_name_en: string;
  night: string;
  check_out?: string;
  now_cents: number;
  prev_cents: number;
  drop_pct: number | string;
  provider_name: string;
  provider_direct: boolean;
};

const TEXT = {
  de: {
    drop: 'Preissturz',
    was: (p: string) => `statt ${p} am Vortag`,
    at: (p: string, direct: boolean) => (direct ? 'auf der Hotelseite' : `bei ${p}`),
    night: '1 Nacht',
    weekend: 'Wochenende, 2 Nächte',
    guests: '2 Erwachsene',
    fallback: 'Preisstürze in Luxushotels',
    fallbackSub: 'Jeden Morgen geprüft. Beide Preise, mit Datum.',
  },
  en: {
    drop: 'Price drop',
    was: (p: string) => `instead of ${p} the day before`,
    at: (p: string, direct: boolean) => (direct ? 'on the hotel website' : `at ${p}`),
    night: '1 night',
    weekend: 'weekend, 2 nights',
    guests: '2 adults',
    fallback: 'Price drops at luxury hotels',
    fallbackSub: 'Checked every morning. Both prices, with the date.',
  },
};

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
const euro = (cents: number, l: 'de' | 'en') =>
  new Intl.NumberFormat(l === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
const pct = (x: number, l: 'de' | 'en') => `−${Math.round(x * 100)}${l === 'de' ? ' %' : '%'}`;
const day = (iso: string, l: 'de' | 'en') =>
  new Intl.DateTimeFormat(l === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${iso}T00:00:00Z`))
    // "Fr., 6. Nov." → "Fr, 6. Nov." like the site (core formatWeekdayDayMonth).
    .replace(/^(\p{L}+)\.,/u, '$1,');

let fonts: { name: string; data: ArrayBuffer; weight: 600 | 800; style: 'normal' }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const get = (w: number) =>
    fetch(
      `https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@5.0.20/latin-${w}-normal.woff`,
    ).then((r) => {
      if (!r.ok) throw new Error(`font ${w}: ${r.status}`);
      return r.arrayBuffer();
    });
  const [a, b] = await Promise.all([get(600), get(800)]);
  fonts = [
    { name: 'Jakarta', data: a, weight: 600, style: 'normal' },
    { name: 'Jakarta', data: b, weight: 800, style: 'normal' },
  ];
  return fonts;
}

async function findDrop(slug: string, key: string): Promise<Row | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return null;
  const [night, checkOut] = key.split('--');
  const weekend = Boolean(checkOut);
  const res = await fetch(`${url}/rest/v1/rpc/${weekend ? 'radar_weekend_drops' : 'radar_drops'}`, {
    method: 'POST',
    headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_today: berlinToday() }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return (
    rows.find(
      (r) => r.hotel_slug === slug && r.night === night && (!weekend || r.check_out === checkOut),
    ) ?? null
  );
}

/**
 * The hotel's original photo (Wikimedia JPEG, `hotels.image_url`) as a data URI, with its credit.
 * Our self-hosted copies are WebP, which the renderer can't read. Fetched here on the server, so no
 * visitor talks to Wikimedia (D-15). Anything but a JPEG or PNG → no photo.
 */
async function photo(slug: string): Promise<{ src: string; credit: string | null } | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return null;
  const res = await fetch(`${url}/rest/v1/hotels?slug=eq.${slug}&select=image_url,image_credit`, {
    headers: { apikey: anon, authorization: `Bearer ${anon}` },
  });
  if (!res.ok) return null;
  const [h] = (await res.json()) as { image_url: string | null; image_credit: string | null }[];
  if (!h?.image_url || !h.image_url.startsWith('https://')) return null;
  const img = await fetch(h.image_url, {
    headers: { 'user-agent': 'TidaqPreview/1.0 (+https://tidaq.com/impressum)' },
  });
  const type = img.headers.get('content-type') ?? '';
  if (!img.ok || !/^image\/(jpeg|png)$/.test(type)) return null;
  const bytes = new Uint8Array(await img.arrayBuffer());
  if (bytes.length > 4_000_000) return null;
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { src: `data:${type};base64,${btoa(bin)}`, credit: h.image_credit };
}

const C = { ink: '#221c3b', accent: '#6a49e0', drop: '#0f6b4a', white: '#ffffff' };

function Card({
  row,
  img,
  l,
}: {
  row: Row | null;
  img: { src: string; credit: string | null } | null;
  l: 'de' | 'en';
}) {
  const t = TEXT[l];
  const logo = (
    <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: C.white }}>
      tidaq<span style={{ color: '#b9a8ff' }}>.</span>
    </div>
  );
  if (!row) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: `linear-gradient(135deg, ${C.ink}, #3b2a8f)`,
          fontFamily: 'Jakarta',
        }}
      >
        {logo}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, fontWeight: 800, color: C.white, lineHeight: 1.1 }}>
            {t.fallback}
          </div>
          <div style={{ marginTop: 20, fontSize: 32, fontWeight: 600, color: '#d6ccf2' }}>
            {t.fallbackSub}
          </div>
        </div>
      </div>
    );
  }
  const drop = Number(row.drop_pct);
  const dates = row.check_out
    ? `${day(row.night, l)} – ${day(row.check_out, l)} · ${t.weekend}`
    : `${day(row.night, l)} · ${t.night}`;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: C.ink,
        fontFamily: 'Jakarta',
      }}
    >
      {img && (
        <img
          src={img.src}
          width={1200}
          height={630}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            objectFit: 'cover',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          background:
            'linear-gradient(90deg, rgba(20,15,40,0.92) 0%, rgba(20,15,40,0.78) 48%, rgba(20,15,40,0.15) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 1200,
          height: 630,
          padding: '56px 64px',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {logo}
          <div
            style={{
              display: 'flex',
              padding: '14px 30px',
              borderRadius: 999,
              background: C.drop,
              color: C.white,
              fontSize: 54,
              fontWeight: 800,
            }}
          >
            {pct(drop, l)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 820 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#7fe0b4', letterSpacing: 2 }}>
            {t.drop.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 60,
              fontWeight: 800,
              color: C.white,
              lineHeight: 1.08,
            }}
          >
            {row.hotel_name}
          </div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 600, color: '#d6ccf2' }}>
            {`${l === 'de' ? row.city_name_de : row.city_name_en} · ${dates} · ${t.guests}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 26 }}>
            <div style={{ fontSize: 84, fontWeight: 800, color: C.white, lineHeight: 1 }}>
              {euro(row.now_cents, l)}
            </div>
            <div style={{ marginLeft: 22, fontSize: 30, fontWeight: 600, color: '#d6ccf2' }}>
              {`${t.was(euro(row.prev_cents, l))} ${t.at(row.provider_name, row.provider_direct)}`}
            </div>
          </div>
        </div>
      </div>
      {img?.credit && (
        <div
          style={{
            position: 'absolute',
            right: 24,
            bottom: 16,
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {`${l === 'de' ? 'Foto' : 'Photo'}: ${img.credit.replace(/^(foto|photo)\s*:\s*/i, '').slice(0, 80)}`}
        </div>
      )}
    </div>
  );
}

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams;
  const slug = q.get('hotel') ?? '';
  const key = q.get('stay') ?? '';
  const l = q.get('l') === 'en' ? 'en' : 'de';
  const valid = SLUG.test(slug) && KEY.test(key);
  const [row, img, f] = await Promise.all([
    valid ? findDrop(slug, key).catch(() => null) : Promise.resolve(null),
    valid ? photo(slug).catch(() => null) : Promise.resolve(null),
    loadFonts(),
  ]);
  // PNG from the renderer, re-encoded as JPEG: a photo PNG is ~1.2 MB, too big for WhatsApp
  // previews; the JPEG is ~150 KB. If the photo breaks the render, retry without it.
  const render = async (withPhoto: boolean) => {
    const png = await new ImageResponse(
      <Card row={row} img={withPhoto && row ? img : null} l={l} />,
      { width: 1200, height: 630, fonts: f },
    ).arrayBuffer();
    const decoded = UPNG.decode(png);
    const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    return jpeg.encode({ data: rgba, width: decoded.width, height: decoded.height }, 82).data;
  };
  let body: Uint8Array;
  try {
    body = await render(true);
  } catch (error) {
    console.error('og-drop render failed, retrying without photo', String(error));
    body = await render(false);
  }
  return new Response(body, {
    headers: {
      'content-type': 'image/jpeg',
      // Drops change daily: crawlers and CDNs may keep it a few hours.
      'cache-control': 'public, max-age=3600, s-maxage=21600',
    },
  });
});
