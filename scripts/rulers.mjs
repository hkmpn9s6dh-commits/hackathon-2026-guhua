/** 抓尺子：把五件同类作品的整屏图抓下来，和我们的首屏一起做盲排。图只进 .tmp，不进仓库。 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const out = resolve('.tmp/gate-d');
await mkdir(out, { recursive: true });

const targets = [
  { key: 'r1-minghuaji', url: 'https://minghuaji.dpm.org.cn/', wait: 4000 },
  { key: 'r2-e-dunhuang', url: 'https://www.e-dunhuang.com/', wait: 5000 },
  { key: 'r3-digicol', url: 'https://digicol.dpm.org.cn/', wait: 4000 },
  { key: 'r4-teamlab', url: 'https://www.teamlab.art/zh-hans/', wait: 5000 },
  { key: 'r5-dpm', url: 'https://www.dpm.org.cn/collection/paint/228354.html', wait: 4500 },
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const t of targets) {
  try {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(t.wait);
    // 关掉遮罩/弹窗，免得抓到一张「用户协议」当尺子
    for (const sel of ['text=同意', 'text=我同意', 'text=同意并继续', 'text=知道了', 'text=关闭']) {
      const el = page.locator(sel).first();
      if (await el.count()) {
        await el.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.screenshot({ path: resolve(out, `${t.key}.png`) });
    console.log('ok', t.key);
  } catch (e) {
    console.log('fail', t.key, String(e).slice(0, 80));
  }
}
await browser.close();
