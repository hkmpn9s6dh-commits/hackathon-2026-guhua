/**
 * 实拍：真浏览器、真构建产物、真移动烛火。
 *
 *   node scripts/shot.mjs
 *
 * 图落在 shots/，自己看，也给盲排的评委看。
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const out = resolve(root, process.env.PINGHOU_SHOT_DIR ?? 'shots');
const DPR = Number(process.env.PINGHOU_SHOT_DPR ?? 2);

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function hold(page, xRatio, ms, yRatio = 0.55) {
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box.x + box.width * xRatio, box.y + box.height * yRatio, { steps: 12 });
  await page.waitForTimeout(ms);
}

async function main() {
  await mkdir(out, { recursive: true });
  const server = await startServer(resolve(root, 'dist'), 4327);
  const browser = await chromium.launch({ executablePath: CHROME });

  try {
    const page = await browser.newPage({ viewport: DESKTOP, deviceScaleFactor: DPR });
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#stage');
    await page.waitForFunction(() => document.body.classList.contains('is-ready'));
    await page.waitForTimeout(900);
    await page.screenshot({ path: resolve(out, '01-first-screen.png') });

    // 一段：听乐
    await hold(page, 0.12, 1600);
    await page.screenshot({ path: resolve(out, '02-listen.png') });

    // 二段：观舞
    await hold(page, 0.32, 1700);
    await page.screenshot({ path: resolve(out, '03-dance.png') });

    // 四段：清吹
    await hold(page, 0.72, 1700);
    await page.screenshot({ path: resolve(out, '04-flute.png') });

    // 五段：散宴
    await hold(page, 0.94, 1700);
    await page.screenshot({ path: resolve(out, '05-leave.png') });

    // 余痕：先照住舞者，再移到空处
    await hold(page, 0.44, 2600);
    await hold(page, 0.6, 420);
    await page.screenshot({ path: resolve(out, '06-memory.png') });

    // 手机
    const phone = await browser.newPage({
      viewport: PHONE,
      deviceScaleFactor: DPR,
      isMobile: true,
      hasTouch: true,
    });
    await phone.goto(server.url, { waitUntil: 'networkidle' });
    await phone.waitForFunction(() => document.body.classList.contains('is-ready'));
    await phone.waitForTimeout(700);
    await phone.screenshot({ path: resolve(out, '07-phone.png') });
    await phone.touchscreen.tap(PHONE.width * 0.42, PHONE.height * 0.5);
    await phone.waitForTimeout(1500);
    await phone.screenshot({ path: resolve(out, '08-phone-tap.png') });
    await phone.close();
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(`shots -> ${out}`);
}

await main();
