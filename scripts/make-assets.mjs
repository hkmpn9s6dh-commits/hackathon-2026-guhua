/**
 * 交件用的两样东西：封面 1500×1000 与演示片（无声）。
 *
 *   node scripts/make-assets.mjs
 *
 * 产出 submission/cover-1500x1000.png 与 submission/pinghou-demo.webm
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const run = promisify(execFile);

/** 找一台真能编 mp4 的 ffmpeg：环境变量 → imageio-ffmpeg 自带 → PATH。
 *  （Playwright 那份是精简构建，只有 webm 封装，别用。） */
function findFfmpeg() {
  const candidates = [
    process.env.FFMPEG,
    'C:/Users/张一/AppData/Roaming/Python/Python38/site-packages/imageio_ffmpeg/binaries/ffmpeg-win64-v4.2.2.exe',
    'ffmpeg',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c === 'ffmpeg') return c;
    if (existsSync(c)) return c;
  }
  return null;
}

const out = resolve(root, 'submission');
await mkdir(out, { recursive: true });

const server = await startServer(resolve(root, 'dist'), 4341);

// ---------- 封面 ----------
{
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'));
  // 首屏那张：站在第一段，不触发题记
  await page.mouse.move(150, 500, { steps: 6 });
  await page.waitForTimeout(3200);
  // 海报模式：把页面自己的字都收起来，封面只留一副字
  await page.addStyleTag({
    content: '.masthead,.note,.ticks,.hint,.lede,.credit{display:none !important}',
  });
  await page.waitForTimeout(300);
  // 只在封面这一张上压标题与记忆点：记忆点一行、≥40px（300px 缩略下仍可读）
  await page.evaluate(() => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;';
    wrap.innerHTML = `
      <div style="position:absolute;left:72px;top:88px;font-family:'Pinghou Serif',serif;color:#f2e8d8;">
        <div style="font-size:64px;letter-spacing:0.16em;line-height:1.05;">屏后</div>
        <div style="margin-top:18px;font-size:40px;letter-spacing:0.08em;line-height:1.35;color:#e8b465;">
          照到哪里，哪里才被记住
        </div>
      </div>
      <div style="position:absolute;left:74px;bottom:64px;font-family:'Pinghou Serif',serif;
                  font-size:22px;letter-spacing:0.14em;color:rgba(217,201,178,.82);">
        顾闳中（传）· 韩熙载夜宴图 · 五代　|　2026 古画 + AI &amp; XR 创新大赛 · 入画游境
      </div>`;
    document.body.appendChild(wrap);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(out, 'cover-1500x1000.png') });
  // 3:2 版本（部分平台要）
  await page.setViewportSize({ width: 1500, height: 1000 });
  await browser.close();
}

// ---------- 演示片（无声） ----------
{
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: resolve(out, 'raw'), size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'));
  await page.waitForTimeout(1600);

  const path = [
    [0.5, 0.5, 1800],
    [0.28, 0.52, 1500],
    [0.12, 0.5, 1600],
    [0.3, 0.55, 1500],
    [0.5, 0.52, 1600],
    [0.7, 0.5, 1700],
    [0.88, 0.52, 1700],
    [0.95, 0.5, 1500],
    [0.6, 0.56, 1400],
    [0.34, 0.5, 1500],
  ];
  for (const [rx, ry, wait] of path) {
    await page.mouse.move(1280 * rx, 800 * ry, { steps: 16 });
    await page.waitForTimeout(wait);
  }
  await page.waitForTimeout(600);
  const video = page.video();
  await ctx.close();
  if (video) {
    const p = await video.path();
    await rename(p, resolve(out, 'pinghou-demo.webm')).catch(async () => {
      await rm(resolve(out, 'pinghou-demo.webm'), { force: true });
      await rename(p, resolve(out, 'pinghou-demo.webm'));
    });
  }
  await browser.close();
}

// ---------- webm → mp4（交件平台多数只收 mp4） ----------
const ffmpeg = findFfmpeg();
if (ffmpeg) {
  try {
    await run(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', resolve(out, 'pinghou-demo.webm'),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
      resolve(out, 'pinghou-demo.mp4'),
    ]);
    const { stdout } = await run(ffmpeg, ['-hide_banner', '-i', resolve(out, 'pinghou-demo.mp4')]).catch((e) => ({
      stdout: String(e.stderr ?? ''),
    }));
    const line = String(stdout).split('\n').find((l) => l.includes('Stream #'));
    console.log('mp4 ->', line?.trim() ?? 'ok');
  } catch (e) {
    console.log('mp4 转码失败（webm 仍在）:', String(e).slice(0, 120));
  }
} else {
  console.log('没找到能编 mp4 的 ffmpeg：webm 已生成，mp4 需另找一台机器转。');
}

await server.close();
console.log('assets ->', out);
