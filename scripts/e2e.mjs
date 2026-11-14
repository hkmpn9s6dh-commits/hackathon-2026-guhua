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
    const failed = [];
    page.on('request', (r) => requests.push(r.url()));
    page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
    page.on('response', (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });

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

    // 素材必须真的加载：五张都在，且都是带哈希的产物地址
    const assets = await page.evaluate(() => window.__pinghou.assets());
    const badAssets = assets.filter((a) => !a.ok);
    check('AC-16 五张场景图都加载成功', badAssets.length === 0, badAssets.map((a) => a.src).join(' | '));
    check('AC-16 场景图地址是构建产物（带哈希）', assets.every((a) => /scene-\d-[A-Za-z0-9_-]{6,}\.webp$/.test(a.src)), assets[0]?.src ?? '');
    check('AC-16 没有任何失败的请求', failed.length === 0, failed.slice(0, 3).join(' | '));

    // 画面必须真的画出东西：中心区的亮度与层次（黑屏会在这里被抓到）
    const look = await page.evaluate(() => {
      const c = document.querySelector('#stage');
      const ctx = c.getContext('2d');
      const w = c.width;
      const h = c.height;
      const d = ctx.getImageData(Math.round(w * 0.32), Math.round(h * 0.28), Math.round(w * 0.36), Math.round(h * 0.44)).data;
      let sum = 0;
      let min = 255;
      let max = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
        n += 1;
      }
      return { mean: sum / n, min, max, spread: max - min };
    });
    check('AC-17 首屏中心不是黑的', look.mean > 18, `均值 ${look.mean.toFixed(1)}/255`);
    check('AC-17 画面有明暗层次', look.spread > 40, `极差 ${look.spread.toFixed(0)}`);

    // 交互必须真的改变画面：同一个点，移动前后两次取样
    const probe = await page.evaluate(() => {
      const c = document.querySelector('#stage');
      const ctx = c.getContext('2d');
      const x = Math.round(c.width * 0.2);
      const y = Math.round(c.height * 0.5);
      const d = ctx.getImageData(x, y, 1, 1).data;
      return (d[0] + d[1] + d[2]) / 3;
    });
    await page.mouse.move(DESKTOP.width * 0.22, DESKTOP.height * 0.5, { steps: 8 });
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      const c = document.querySelector('#stage');
      const ctx = c.getContext('2d');
      const x = Math.round(c.width * 0.2);
      const y = Math.round(c.height * 0.5);
      const d = ctx.getImageData(x, y, 1, 1).data;
      return (d[0] + d[1] + d[2]) / 3;
    });
    check('AC-18 移动指针会改变画面', Math.abs(after - probe) > 6, `${probe.toFixed(1)} → ${after.toFixed(1)}`);

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
      const bright = await page.evaluate(() => {
        const c = document.querySelector('#stage');
        const ctx = c.getContext('2d');
        const d = ctx.getImageData(Math.round(c.width * 0.35), Math.round(c.height * 0.3), Math.round(c.width * 0.3), Math.round(c.height * 0.4)).data;
        let sum = 0;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) { sum += (d[i] + d[i + 1] + d[i + 2]) / 3; n += 1; }
        return sum / n;
      });
      check(`AC-17 第 ${want + 1} 段画面有内容`, bright > 18, `均值 ${bright.toFixed(1)}`);
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

    // 余痕：换一张干净的页面量。烛光横坐标总在视口中央，所以用「上下」来把光挪开。
    const memPage = await browser.newPage({ viewport: DESKTOP, deviceScaleFactor: 2 });
    await memPage.goto(base, { waitUntil: 'domcontentloaded' });
    await memPage.bringToFront();
    await waitReady(memPage);
    await memPage.waitForTimeout(400);
    const P = { x: DESKTOP.width / 2, y: DESKTOP.height * 0.3 };
    const sample = () => memPage.evaluate(({ x, y }) => window.__pinghou.sampleMemory(x, y), P);

    // 先把烛压到画面下部，让 P 完全没被照过
    await memPage.mouse.move(P.x, DESKTOP.height * 0.86, { steps: 10 });
    await memPage.waitForTimeout(1500);
    const empty = await sample();

    // 把烛举到 P 上停两秒
    await memPage.mouse.move(P.x, P.y, { steps: 12 });
    await memPage.waitForTimeout(2200);
    const lit = await sample();
    check('AC-6 照过的地方留下余痕', lit > empty + 20, `${empty} → ${lit}`);

    // 再把烛压下去，P 不再被照到
    await memPage.mouse.move(P.x, DESKTOP.height * 0.86, { steps: 10 });
    await memPage.waitForTimeout(10000);
    const faded = await sample();
    check('AC-6 十秒后余痕衰减到三成以下', faded < lit * 0.35, `${lit} → ${faded}`);
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
