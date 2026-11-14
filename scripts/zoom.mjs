/** 一次性排错：把光斑区域放大截一张，看看里面到底是什么。 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const server = await startServer(resolve(root, 'dist'), 4328);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(server.url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.body.classList.contains('is-ready'));
await page.mouse.move(720, 520, { steps: 8 });
await page.waitForTimeout(2200);
await page.screenshot({ path: resolve(root, 'shots/zoom.png'), clip: { x: 470, y: 260, width: 620, height: 520 } });
await browser.close();
await server.close();
console.log('zoom ok');
