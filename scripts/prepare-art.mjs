/**
 * 把生成好的五张场景图处理成随包素材：去水印、统一尺寸、转 webp。
 *
 *   node scripts/prepare-art.mjs
 *
 * 只在换图时跑一次；产物进 src/assets/，跟包走。
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const SRC = resolve(root, '.tmp', 'gen');
const OUT = resolve(root, 'src', 'assets');
const W = 1600;
const H = Math.round((W * 1024) / 1536); // 1067，与生成时的 3:2 一致

// 生成顺序 → 第几段
const ORDER = [
  ['06-07-00', 1],
  ['06-07-49', 2],
  ['06-08-10', 3],
  ['06-08-38', 4],
  ['06-09-00', 5],
];

await mkdir(OUT, { recursive: true });
const files = await readdir(SRC);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('about:blank');

for (const [stamp, idx] of ORDER) {
  const file = files.find((f) => f.includes(stamp));
  if (!file) throw new Error(`找不到 ${stamp} 的图`);
  const b64 = (await readFile(resolve(SRC, file))).toString('base64');
  const dataUrl = await page.evaluate(
    async ({ b64, W, H }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      // 等比铺满
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

      // 右下角的生成水印：用一圈同色的暗角盖掉（这一带本来就是地面）
      const g = ctx.createRadialGradient(W - 40, H - 10, 0, W - 40, H - 10, 260);
      g.addColorStop(0, 'rgba(8,7,6,0.98)');
      g.addColorStop(0.55, 'rgba(8,7,6,0.9)');
      g.addColorStop(1, 'rgba(8,7,6,0)');
      ctx.fillStyle = g;
      ctx.fillRect(W - 340, H - 200, 340, 200);

      return c.toDataURL('image/webp', 0.86);
    },
    { b64, W, H },
  );
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  await writeFile(resolve(OUT, `scene-${idx}.webp`), buf);
  console.log(`scene-${idx}.webp  ${(buf.length / 1024).toFixed(0)} KB  ←  ${file}`);
}

await browser.close();
