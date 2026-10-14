// Renders the default Open Graph image (C-028b): 1200×630 PNG for pages without a hotel photo.
// Run from apps/web (Playwright lives there):  node ../../scripts/og/render.mjs
// Output: apps/web/public/og/default.png (committed; re-run only when the design changes).
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../../apps/web/public/og/default.png', import.meta.url));
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;font-family:'Plus Jakarta Sans',sans-serif;background:#f5f3fc;color:#221c3b;overflow:hidden}
  .blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55}
  .b1{width:520px;height:520px;background:#d9ccff;right:-120px;top:-140px}
  .b2{width:420px;height:420px;background:#ffd6e8;right:180px;bottom:-220px}
  .wrap{position:absolute;inset:0;padding:80px 90px;display:flex;flex-direction:column;justify-content:space-between}
  .logo{font-size:52px;font-weight:800;letter-spacing:-.04em}
  .logo span{color:#6a49e0}
  h1{margin:0;font-size:76px;line-height:1.02;font-weight:800;letter-spacing:-.035em;max-width:900px}
  h1 em{font-style:normal;color:#6a49e0}
  p{margin:18px 0 0;font-size:30px;font-weight:500;color:#5d5675;max-width:820px}
  svg{position:absolute;right:90px;top:84px}
</style></head><body>
<div class="blob b1"></div><div class="blob b2"></div>
<div class="wrap">
  <div class="logo">tidaq<span>.</span></div>
  <div>
    <h1>Ist der Preis für dein Luxushotel <em>gerade gut?</em></h1>
    <p>Der Preisverlauf jeder Nacht, von allen Buchungsseiten.</p>
  </div>
</div>
<svg width="300" height="120" viewBox="0 0 300 120" fill="none">
  <path d="M4 30 C 50 26, 70 60, 110 52 S 170 20, 200 58 S 250 104, 296 96" stroke="#6a49e0" stroke-width="6" stroke-linecap="round"/>
  <circle cx="296" cy="96" r="9" fill="#6a49e0"/>
</svg>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`wrote ${out}`);
