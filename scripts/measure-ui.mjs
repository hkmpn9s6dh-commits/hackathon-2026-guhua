/**
 * 界面卫生量测：字号、对比度、溢出、首屏文字占比。
 *
 *   node scripts/measure-ui.mjs
 *
 * 写出 proof/ui/report.md；退出码 0 表示全过。它只管卫生，不判审美。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.PINGHOU_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

const MIN_FONT = 12;
const MIN_CONTRAST = 4.5;

function luminance([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function parseColor(s) {
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (!m) return [255, 255, 255, 1];
  const parts = m[1].split(',').map((v) => Number(v.trim()));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}

const rows = [];
const problems = [];

async function measure(page, vp, base) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'));
  await page.waitForTimeout(900);

  const info = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent ?? '').trim().slice(0, 24),
        fontSize: parseFloat(cs.fontSize),
        color: cs.color,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
      };
    };
    const canvas = document.querySelector('#stage');
    const ctx = canvas.getContext('2d');
    const sample = (x, y) => {
      const dpr = canvas.width / window.innerWidth;
      const d = ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
    const title = box('.masthead');
    const note = box('#note');
    const hint = box('#hint');
    const credit = box('.credit');
    const textArea = [title, note, hint, credit]
      .filter(Boolean)
      .reduce((acc, b) => acc + b.width * b.height, 0);
    return {
      title: pick('.title'),
      noteName: pick('.note-name'),
      noteText: pick('.note-text'),
      hint: pick('#hint'),
      credit: pick('.credit'),
      bgSamples: {
        title: title ? sample(title.x + title.width / 2, title.y + title.height / 2) : [10, 9, 8],
        note: note ? sample(note.x + 12, note.y + note.height / 2) : [10, 9, 8],
        hint: hint ? sample(hint.x + hint.width / 2, hint.y + hint.height / 2) : [10, 9, 8],
        credit: credit ? sample(credit.x + credit.width / 2, credit.y + credit.height / 2) : [10, 9, 8],
      },
      textRatio: textArea / (window.innerWidth * window.innerHeight),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const pairs = [
    ['标题「屏后」', info.title, info.bgSamples.title],
    ['段名', info.noteName, info.bgSamples.note],
    ['题记', info.noteText, info.bgSamples.note],
    ['操作提示', info.hint, info.bgSamples.hint],
    ['出处', info.credit, info.bgSamples.credit],
  ];

  for (const [label, el, bg] of pairs) {
    if (!el) {
      problems.push(`${vp.name} 找不到「${label}」`);
      continue;
    }
    const [r, g, b, a] = parseColor(el.color);
    // 半透明文字按叠加到背景后的实际颜色算
    const blended = [
      Math.round(r * a + bg[0] * (1 - a)),
      Math.round(g * a + bg[1] * (1 - a)),
      Math.round(b * a + bg[2] * (1 - a)),
    ];
    const c = contrast(blended, bg);
    const okFont = el.fontSize >= MIN_FONT;
    const okContrast = c >= MIN_CONTRAST;
    rows.push({
      vp: vp.name,
      label,
      font: el.fontSize,
      okFont,
      contrast: c,
      okContrast,
    });
    if (!okFont) problems.push(`${vp.name} 「${label}」字号 ${el.fontSize}px < ${MIN_FONT}px`);
    if (!okContrast) problems.push(`${vp.name} 「${label}」对比度 ${c.toFixed(2)} < ${MIN_CONTRAST}`);
    const overflow = el.x < -1 || el.y < -1 || el.x + el.w > vp.width + 1 || el.y + el.h > vp.height + 1;
    if (overflow) problems.push(`${vp.name} 「${label}」超出视口`);
  }

  if (info.overflowX > 0) problems.push(`${vp.name} 横向溢出 ${info.overflowX}px`);
  if (info.textRatio > 0.12) problems.push(`${vp.name} 首屏文字占比 ${(info.textRatio * 100).toFixed(1)}% > 12%`);
}

async function main() {
  const server = await startServer(resolve(root, 'dist'), 4333);
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await measure(page, vp, server.url);
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const lines = [
    '# UI 量测报告',
    '',
    `生成：${new Date().toISOString()}　基准：${VIEWPORTS.map((v) => `${v.name} ${v.width}×${v.height}`).join(' / ')}`,
    '',
    `门槛：正文 ≥ ${MIN_FONT}px，对比度 ≥ ${MIN_CONTRAST}:1，不溢出，首屏文字占比 ≤ 12%。`,
    '',
    '| 视口 | 元素 | 字号 | 对比度 | 结论 |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.vp} | ${r.label} | ${r.font}px | ${r.contrast.toFixed(2)}:1 | ${r.okFont && r.okContrast ? '过' : '不过'} |`,
    ),
    '',
    problems.length ? `## 问题（${problems.length}）\n\n${problems.map((p) => `- ${p}`).join('\n')}` : '## 问题\n\n0 条。',
  ];
  await mkdir(resolve(root, 'proof', 'ui'), { recursive: true });
  await writeFile(resolve(root, 'proof', 'ui', 'report.md'), `${lines.join('\n')}\n`, 'utf8');

  console.log(`${rows.length} 项量测，${problems.length} 个问题`);
  for (const p of problems) console.log(`  - ${p}`);
  if (problems.length) process.exit(1);
}

await main();
