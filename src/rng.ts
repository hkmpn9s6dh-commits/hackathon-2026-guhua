// 可复现的随机：同一个 seed 画出同一间屋子（AC-14）。

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 一维值噪声，用来做烛火抖动与绢纹。确定性，不依赖时间。 */
export function valueNoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = mulberry32((seed ^ Math.imul(i, 374761393)) >>> 0)();
  const b = mulberry32((seed ^ Math.imul(i + 1, 374761393)) >>> 0)();
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
