import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const imgs = new Map();
p.on('response', async (r) => {
  const u = r.url();
  if (!/\.(png|jpg|jpeg)$/i.test(u)) return;
  try {
    const buf = await r.body();
    imgs.set(u, buf.length);
  } catch {}
});
await p.goto('https://minghuaji.dpm.org.cn/paint/detail?id=ebfcda63da386f527526ef7d780ce30f', { waitUntil: 'networkidle' });
await p.waitForTimeout(6000);
// 试着滚/缩放触发更多瓦片
for (let i = 0; i < 6; i += 1) { await p.mouse.wheel(0, 300); await p.waitForTimeout(600); }
await p.waitForTimeout(3000);
const list = [...imgs.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 15);
console.log('count', imgs.size);
for (const [u, s] of list) console.log(s, u);
await b.close();
