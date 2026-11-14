import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { startServer } from './scripts/serve.mjs';
const server = await startServer(resolve('dist'), 4335);
const browser = await chromium.launch({ executablePath: 'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(server.url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.body.classList.contains('is-ready'));
await page.mouse.move(720, 540, { steps: 5 });
for (let i = 0; i < 6; i += 1) {
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => ({
    mem: window.__pinghou.sampleMemory(720, 900 * 0.62),
    frames: window.__pinghou.frames,
  }));
  console.log(i, JSON.stringify(r));
}
await page.mouse.move(720, 180, { steps: 5 });
for (let i = 0; i < 6; i += 1) {
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => ({
    mem: window.__pinghou.sampleMemory(720, 900 * 0.62),
    frames: window.__pinghou.frames,
    y: window.__pinghou.state.light.y,
  }));
  console.log('away', i, JSON.stringify(r));
}
await browser.close(); await server.close();
