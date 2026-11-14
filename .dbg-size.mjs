import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const dir = resolve('../.tmp/art/seg');
const b = await chromium.launch({ executablePath: 'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const p = await b.newPage();
for (const f of readdirSync(dir)) {
  await p.goto('file:///' + resolve(dir, f).replace(/\\/g, '/'));
  const s = await p.evaluate(() => { const i = document.querySelector('img'); return [i.naturalWidth, i.naturalHeight]; });
  console.log(s.join('×'), f);
}
await b.close();
