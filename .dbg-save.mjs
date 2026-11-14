import { chromium } from 'playwright-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve('../.tmp/art/seg');
await mkdir(out, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const saved = [];
p.on('response', async (r) => {
  const u = r.url();
  if (!/\/paint\/.*\.(png|jpg|jpeg)$/i.test(u)) return;
  try {
    const buf = await r.body();
    if (buf.length < 200000) return;
    const name = u.split('/').slice(-1)[0];
    await writeFile(resolve(out, name), buf);
    saved.push([name, buf.length]);
  } catch {}
});
await p.goto('https://minghuaji.dpm.org.cn/paint/detail?id=ebfcda63da386f527526ef7d780ce30f', { waitUntil: 'networkidle' });
await p.waitForTimeout(9000);
for (let i = 0; i < 8; i += 1) { await p.mouse.wheel(0, 260); await p.waitForTimeout(500); }
await p.waitForTimeout(4000);
console.log(saved.length, 'files');
for (const s of saved) console.log(s[1], s[0]);
await b.close();
