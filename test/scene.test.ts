import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashString, mulberry32, valueNoise } from '../src/rng.js';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

describe('可复现（AC-14）', () => {
  it('同一个 seed 出同一串数', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('不同 seed 出不同的数', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });

  it('哈希稳定且落在 32 位内', () => {
    expect(hashString('屏后')).toBe(hashString('屏后'));
    expect(hashString('屏后')).not.toBe(hashString('屏后 '));
    expect(hashString('x')).toBeGreaterThanOrEqual(0);
    expect(hashString('x')).toBeLessThan(2 ** 32);
  });

  it('噪声在 0..1 之间，且不随时间抖动', () => {
    for (let i = 0; i < 200; i += 1) {
      const v = valueNoise(7, i * 0.37);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(valueNoise(7, 12.5)).toBe(valueNoise(7, 12.5));
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe('版权与随包（AC-12）', () => {
  it('仓库里没有任何图片或音频素材', () => {
    const files = walk(join(root, 'src'));
    const media = files.filter((f) => /\.(png|jpe?g|gif|webp|avif|mp3|wav|ogg|m4a|mp4)$/i.test(f));
    expect(media).toEqual([]);
  });

  it('只有一个随包字体，且是 woff2 子集', () => {
    const fonts = walk(join(root, 'src', 'assets')).filter((f) => /\.woff2$/i.test(f));
    expect(fonts).toHaveLength(1);
    const size = statSync(fonts[0]!).size;
    expect(size).toBeGreaterThan(20_000);
    expect(size).toBeLessThan(200_000);
  });

  it('源码里没有外链（运行时不联网，AC-7）', () => {
    const files = walk(join(root, 'src')).filter((f) => /\.(ts|css)$/i.test(f));
    const bad: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const hits = text.match(/https?:\/\/(?!127\.0\.0\.1|localhost)[^\s'"`)]+/g) ?? [];
      for (const h of hits) bad.push(`${f}: ${h}`);
    }
    expect(bad).toEqual([]);
  });

  it('源码里没有密钥形状的字符串', () => {
    const files = walk(join(root, 'src')).filter((f) => /\.(ts|css)$/i.test(f));
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      expect(text).not.toMatch(/sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/);
    }
  });
});

describe('题记文案', () => {
  it('五行题记不带句号，末尾留白', () => {
    const src = readFileSync(join(root, 'src', 'state.ts'), 'utf8');
    const notes = [...src.matchAll(/note: '([^']+)'/g)].map((m) => m[1]!);
    expect(notes).toHaveLength(5);
    for (const n of notes) {
      expect(n.endsWith('。')).toBe(false);
      expect(n.length).toBeLessThanOrEqual(18);
    }
  });
});
