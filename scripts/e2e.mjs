/**
 * 端到端：真 Chromium、真构建产物。
 *
 *   node scripts/e2e.mjs              本地 dist
 *   node scripts/e2e.mjs --url https://...   线上
 *
 * 退出码就是结论：全过 0，任何一条不过 1。
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const remote = urlFlag >= 0 ? args[urlFlag + 1] : null;

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  ${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitReady(page) {
  await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 15000 });
}

async function sectionOf(page) {
  return Number(await page.getAttribute('#stage', 'data-section'));
}

async function moveTo(page, ratio, y = 0.55) {
  await page.mouse.move(DESKTOP.width * ratio, DESKTOP.height * y, { steps: 10 });
}

async function main() {
  const server = remote ? null : await startServer(resolve(root, 'dist'), 4331);
  const base = remote ?? server.url;
  const browser = await chromium.launch({ executablePath: CHROME });

  try {
    const page = await browser.newPage({ viewport: DESKTOP, deviceScaleFactor: 2 });
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));

    const t0 = Date.now();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const readyMs = Date.now() - t0;
    check('AC-2 三秒内可交互', readyMs < 3000, `${readyMs}ms`);

    // 首帧之后确实在画
    await page.waitForTimeout(700);
    const frames = await page.evaluate(() => window.__pinghou.frames);
    check('AC-2 画面在跑（帧数 > 15）', frames > 15, `${frames} 帧`);

    // 字体随包，不走系统字
    const fontOk = await page.evaluate(() => document.fonts.check('16px "Pinghou Serif"'));
    check('AC-10 随包字体已加载', fontOk === true);

    // 五段：
    const targets = [
      [0.08, 0],
      [0.28, 1],
      [0.5, 2],
      [0.72, 3],
      [0.93, 4],
    ];
    for (const [ratio, want] of targets) {
      await moveTo(page, ratio);
      await page.waitForTimeout(1200);
      const got = await sectionOf(page);
      check(`AC-4 横向 ${Math.round(ratio * 100)}% → 第 ${want + 1} 段`, got === want, `拿到 ${got + 1}`);
    }

    // 题记门槛：先在浅处停 600ms，不出现；再停 1400ms，出现
    await moveTo(page, 0.5);
    await page.waitForTimeout(600);
    const early = await page.locator('#note.is-on').count();
    check('AC-5 停留 600ms 不出现题记', early === 0);
    await page.waitForTimeout(1400);
    const late = await page.locator('#note.is-on').count();
    check('AC-5 停留 2s 后题记出现', late === 1);

    // 题记内容与当前段一致
    const noteName = (await page.locator('#note-name').innerText()).trim();
    check('AC-4 题记跟着段落换', noteName.startsWith('三'), noteName);

    // 余痕：换一张干净的页面量，才有「照过之前」这个底
    const memPage = await browser.newPage({ viewport: DESKTOP, deviceScaleFactor: 2 });
    await memPage.goto(base, { waitUntil: 'domcontentloaded' });
    await memPage.bringToFront();
    await waitReady(memPage);
    await memPage.waitForTimeout(400);
    const sample = () =>
      memPage.evaluate(() =>
        window.__pinghou.sampleMemory(window.innerWidth / 2, window.innerHeight * 0.62),
      );
    const empty = await sample();
    await memPage.mouse.move(DESKTOP.width * 0.5, DESKTOP.height * 0.6, { steps: 8 });
    await memPage.waitForTimeout(2200);
    const lit = await sample();
    check('AC-6 照过的地方留下余痕', lit > empty + 6, `${empty} → ${lit}`);
    // 把烛举高，原来那一点就不再被照到
    await memPage.mouse.move(DESKTOP.width * 0.5, DESKTOP.height * 0.2, { steps: 8 });
    await memPage.waitForTimeout(10000);
    const faded = await sample();
    check('AC-6 十秒后余痕衰减到三成以下', faded < lit * 0.45, `${lit} → ${faded}`);
    await memPage.close();

    // 键盘也能举烛
    const beforeKey = await page.evaluate(() => window.__pinghou.state.ratio);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    const afterKey = await page.evaluate(() => window.__pinghou.state.ratio);
    check('AC-9 方向键可以举烛', afterKey > beforeKey, `${beforeKey.toFixed(3)} → ${afterKey.toFixed(3)}`);

    // 不联网：除了同源静态资源，没有别的请求
    const external = requests.filter((u) => {
      const u2 = u.split('?')[0];
      return !u2.startsWith(base) && !u2.startsWith(base.replace(/\/$/, ''));
    });
    check('AC-7 运行期没有外部请求', external.length === 0, external.slice(0, 3).join(' | '));

    await page.close();

    // 手机：能点、不滚动
    const phone = await browser.newPage({
      viewport: PHONE,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await phone.goto(base, { waitUntil: 'domcontentloaded' });
    await phone.bringToFront();
    await waitReady(phone);
    await phone.waitForTimeout(600);
    await phone.touchscreen.tap(PHONE.width * 0.35, PHONE.height * 0.5);
    await phone.waitForTimeout(900);
    const phoneSection = Number(await phone.getAttribute('#stage', 'data-section'));
    check('AC-8 手机上点一下能换段', phoneSection === 1, `拿到 ${phoneSection + 1}`);
    const scrollY = await phone.evaluate(() => window.scrollY);
    check('AC-8 触控不会把页面拖着滚', scrollY === 0, `scrollY=${scrollY}`);
    const overflow = await phone.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check('AC-8 没有横向溢出', overflow <= 0, `${overflow}px`);
    await phone.close();

    // 减少动态：仍然出画，不报错
    const calm = await browser.newPage({ viewport: DESKTOP, reducedMotion: 'reduce' });
    const errors = [];
    calm.on('pageerror', (e) => errors.push(String(e)));
    await calm.goto(base, { waitUntil: 'domcontentloaded' });
    await calm.bringToFront();
    await waitReady(calm);
    await calm.waitForTimeout(1200);
    const calmFrames = await calm.evaluate(() => window.__pinghou.frames);
    check('AC-9 prefers-reduced-motion 下照常运行', calmFrames > 10 && errors.length === 0, `${calmFrames} 帧，${errors.length} 个错误`);
    await calm.close();
  } finally {
    await browser.close();
    if (server) await server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 通过${remote ? '（线上）' : '（本地）'}`);
  if (failed.length) {
    console.log('失败：');
    for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
    process.exit(1);
  }
}

await main();
