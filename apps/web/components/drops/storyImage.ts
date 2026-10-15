/**
 * The "Als Story teilen" image (C-080b): 1080 × 1920 (Instagram/TikTok story), drawn in the
 * browser on a canvas, so it costs no server CPU (Workers free plan, B-017). The hotel photo is
 * self-hosted, so the canvas stays untainted and can be exported. Every text is passed in already
 * translated and formatted; this file only lays it out. Key facts stay inside the platforms' safe
 * zone (about 250 px free at the top and bottom for their UI).
 */

import { wrapLines } from '@tidaq/core';

export const STORY = { width: 1080, height: 1920 } as const;

export interface StoryText {
  /** "−31 %" */
  pct: string;
  hotel: string;
  /** "Zürich · Di, 27. Okt." */
  place: string;
  /** "684 €" */
  now: string;
  /** "Vortag 989 €" */
  was: string;
  /** "305 € weniger bei Booking.com" */
  saved: string;
  /** "Niedrigster Preis seit 10 Tagen" */
  low: string;
  /** "Stand 15. Okt., 08:12 · 1 Nacht, 2 Erwachsene" */
  asOf: string;
  /** "tidaq.com/preissturz" */
  url: string;
}

const C = {
  bg: '#221c3b',
  white: '#ffffff',
  muted: '#c9bef5',
  good: '#4fd1a0',
  drop: '#0f6b4a',
  accent: '#8b6cf0',
};

const PHOTO_H = 1020;
const X = 84;
const MAX_W = STORY.width - 2 * X;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/** Draws `img` to fill the box (CSS `object-fit: cover`). */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

type Font = (weight: number, size: number) => string;

/** Wordmark, where to find it, when it was seen: the same on every image. */
function footer(ctx: CanvasRenderingContext2D, f: Font, url: string, asOf: string) {
  const fy = STORY.height - 270;
  ctx.font = f(800, 72);
  ctx.fillStyle = C.white;
  ctx.fillText('tidaq', X, fy);
  const wordW = ctx.measureText('tidaq').width;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(X + wordW + 14, fy - 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = f(700, 42);
  ctx.fillStyle = C.white;
  ctx.textAlign = 'right';
  ctx.fillText(url, STORY.width - X, fy - 6);
  ctx.textAlign = 'left';
  ctx.font = f(500, 32);
  ctx.fillStyle = C.muted;
  ctx.fillText(asOf, X, fy + 64, MAX_W);
}

/** Sizes the canvas, loads the font weights and paints the background. */
async function setup(canvas: HTMLCanvasElement, font: string) {
  canvas.width = STORY.width;
  canvas.height = STORY.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  await Promise.all(
    ['500', '600', '700', '800'].map((w) =>
      document.fonts?.load(`${w} 48px ${font}`).catch(() => []),
    ),
  );
  const f: Font = (weight, size) => `${weight} ${size}px ${font}`;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, STORY.width, STORY.height);
  ctx.textBaseline = 'alphabetic';
  return { ctx, f };
}

/** Draws the story onto `canvas` (resized to 1080 × 1920). `font` is the page's font family. */
export async function drawStory(
  canvas: HTMLCanvasElement,
  photo: string | null,
  text: StoryText,
  font: string,
): Promise<void> {
  const { ctx, f } = await setup(canvas, font);

  const img = photo ? await loadImage(photo) : null;
  if (img) cover(ctx, img, STORY.width, PHOTO_H);
  // Photo fades into the background so the text below reads on any picture.
  const fade = ctx.createLinearGradient(0, PHOTO_H - 520, 0, PHOTO_H);
  fade.addColorStop(0, 'rgba(34,28,59,0)');
  fade.addColorStop(1, C.bg);
  ctx.fillStyle = fade;
  ctx.fillRect(0, PHOTO_H - 520, STORY.width, 520);
  const top = ctx.createLinearGradient(0, 0, 0, 300);
  top.addColorStop(0, 'rgba(34,28,59,0.55)');
  top.addColorStop(1, 'rgba(34,28,59,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, STORY.width, 300);

  // The drop, as big as it gets.
  ctx.font = f(800, 120);
  const pctW = ctx.measureText(text.pct).width;
  const pillH = 160;
  const pillY = 690;
  ctx.fillStyle = C.drop;
  pill(ctx, X - 8, pillY, pctW + 112, pillH);
  ctx.fillStyle = C.white;
  ctx.fillText(text.pct, X + 48, pillY + 126);

  let y = pillY + pillH + 104;
  ctx.font = f(800, 80);
  const hotel = wrapLines((s) => ctx.measureText(s).width, text.hotel, MAX_W, 2);
  for (const line of hotel) {
    ctx.fillText(line, X, y);
    y += 92;
  }
  ctx.font = f(600, 42);
  ctx.fillStyle = C.muted;
  ctx.fillText(text.place, X, y - 22, MAX_W);
  y += 176;

  ctx.font = f(800, 168);
  ctx.fillStyle = C.white;
  ctx.fillText(text.now, X - 6, y, MAX_W);
  y += 82;
  ctx.font = f(600, 46);
  ctx.fillStyle = C.muted;
  ctx.fillText(text.was, X, y, MAX_W);
  y += 80;
  ctx.font = f(700, 46);
  ctx.fillStyle = C.good;
  ctx.fillText(text.saved, X, y, MAX_W);
  y += 62;
  ctx.font = f(500, 40);
  ctx.fillStyle = C.muted;
  ctx.fillText(text.low, X, y, MAX_W);

  footer(ctx, f, text.url, text.asOf);
}

export interface CoverText {
  /** "Preisstürze seit gestern" */
  eyebrow: string;
  /** "Top 5 in Luxushotels" */
  title: string;
  rows: { pct: string; hotel: string; place: string }[];
  asOf: string;
  url: string;
}

/** The first slide of a top-list carousel (C-080c): the day's biggest drops as a ranked list. */
export async function drawCover(
  canvas: HTMLCanvasElement,
  text: CoverText,
  font: string,
): Promise<void> {
  const { ctx, f } = await setup(canvas, font);
  ctx.font = f(700, 40);
  ctx.fillStyle = C.good;
  ctx.fillText(text.eyebrow.toLocaleUpperCase('de'), X, 330, MAX_W);
  ctx.font = f(800, 96);
  ctx.fillStyle = C.white;
  let y = 440;
  for (const line of wrapLines((s) => ctx.measureText(s).width, text.title, MAX_W, 2)) {
    ctx.fillText(line, X, y);
    y += 108;
  }
  y += 40;
  for (const [i, row] of text.rows.slice(0, 5).entries()) {
    const top = y + i * 200;
    ctx.font = f(800, 56);
    const w = ctx.measureText(row.pct).width;
    ctx.fillStyle = C.drop;
    pill(ctx, X - 4, top, w + 56, 84);
    ctx.fillStyle = C.white;
    ctx.fillText(row.pct, X + 24, top + 62);
    const tx = X + Math.max(w + 56, 250) + 28;
    const tw = STORY.width - X - tx;
    ctx.font = f(800, 46);
    ctx.fillText(
      wrapLines((s) => ctx.measureText(s).width, row.hotel, tw, 1)[0] ?? '',
      tx,
      top + 40,
    );
    ctx.font = f(600, 34);
    ctx.fillStyle = C.muted;
    ctx.fillText(row.place, tx, top + 88, tw);
  }
  footer(ctx, f, text.url, text.asOf);
}

/** The finished image as a PNG file. */
export function canvasFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(new File([blob], name, { type: 'image/png' })) : reject(new Error('toBlob')),
      'image/png',
    ),
  );
}
