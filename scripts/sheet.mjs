/**
 * 盲排拼图：六张整屏图（我们的首屏 + 五件同类作品），随机字母命名。
 *
 *   node scripts/sheet.mjs
 *
 * 产出 .tmp/gate-d/sheet-1.png 与 .tmp/gate-d/key.json（答案钥匙，评委不给看）。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { mulberry32 } from './rng-seed.mjs';

const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const out = resolve('.tmp/gate-d');
await mkdir(out, { recursive: true });

const tiles = [
  { key: 'ours', src: resolve('shots/01-first-screen.png'), label: '屏后（我们的）' },
  { key: 'r1-minghuaji', src: resolve(out, 'r1-minghuaji.png'), label: '故宫名画记' },
  { key: 'r2-e-dunhuang', src: resolve(out, 'r2-e-dunhuang.png'), label: '数字敦煌' },
  { key: 'r3-digicol', src: resolve(out, 'r3-digicol.png'), label: '故宫数字文物库' },
  { key: 'r4-teamlab', src: resolve(out, 'r4-teamlab.png'), label: 'teamLab' },
  { key: 'r5-dpm', src: resolve(out, 'r5-dpm.png'), label: '故宫藏品页（韩熙载夜宴图）' },
];

const rnd = mulberry32(20261114);
const order = [...tiles];
for (let i = order.length - 1; i > 0; i -= 1) {
  const j = Math.floor(rnd() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
const key = Object.fromEntries(order.map((t, i) => [letters[i], t.label]));

const html = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#111; font-family: system-ui, sans-serif; }
  .grid { display:grid; grid-template-columns: repeat(2, 720px); gap:0; }
  .cell { position:relative; width:720px; height:450px; overflow:hidden; }
  .cell img { width:720px; height:450px; object-fit:cover; display:block; }
  .tag { position:absolute; left:14px; top:12px; font-size:34px; font-weight:700; color:#fff;
         background:rgba(0,0,0,.62); padding:2px 14px; border-radius:4px; letter-spacing:2px; }
</style>
<div class="grid">
${order
  .map(
    (t, i) =>
      `<div class="cell"><img src="file:///${t.src.replace(/\\/g, '/')}"><span class="tag">${letters[i]}</span></div>`,
  )
  .join('\n')}
</div>`;

await writeFile(resolve(out, 'sheet-1.html'), html, 'utf8');
await writeFile(resolve(out, 'key.json'), JSON.stringify(key, null, 2), 'utf8');

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 1350 } });
await page.goto(`file:///${resolve(out, 'sheet-1.html').replace(/\\/g, '/')}`);
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(out, 'sheet-1.png') });
await browser.close();
console.log('sheet ->', resolve(out, 'sheet-1.png'));
console.log(key);
