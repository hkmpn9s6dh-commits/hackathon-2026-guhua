import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://g2.ltfc.net/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
// 找搜索图标
const cands = await p.$$eval('*', els => els.filter(e => /search/i.test(e.className?.toString?.() || '') ).slice(0, 8).map(e => e.tagName + '.' + e.className));
console.log('search-ish:', cands);
const icon = p.locator('[class*=search]').first();
if (await icon.count()) { await icon.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200); }
console.log('inputs now', await p.locator('input:visible').count());
const inp = p.locator('input:visible').first();
if (await inp.count()) {
  await inp.fill('韩熙载夜宴图');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(5000);
  console.log('url', p.url());
  const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300));
  console.log(t);
  const links = await p.$$eval('a', as => [...new Set(as.map(a => a.getAttribute('href') || ''))].filter(h => /painting|detail|\/p\//.test(h)).slice(0, 10));
  console.log('links', links);
}
await b.close();
