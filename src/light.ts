// 光：观众手里那支烛，以及它照过之后留下的余痕。

import { INK } from './palette.js';
import { lightRadius, type State } from './state.js';
import { valueNoise } from './rng.js';

export interface LightLayer {
  /** 亮版场景，按光斑软边裁好。 */
  lit: HTMLCanvasElement;
  /** 盖余痕用的临时小画布。 */
  stamp: HTMLCanvasElement;
  /** 余痕累积层（低分辨率）。 */
  memory: HTMLCanvasElement;
  memoryFade: number;
  /** 褪色的累积时间：每秒 60 次 0.002 的叠加会被量化吃掉，改成每 0.2 秒一次。 */
  fadeAcc: number;
}

export function createLightLayer(width: number, height: number, dpr: number): LightLayer {
  const lit = document.createElement('canvas');
  lit.width = Math.max(1, Math.round(width * dpr));
  lit.height = Math.max(1, Math.round(height * dpr));
  const stamp = document.createElement('canvas');
  stamp.width = Math.max(1, Math.round(width * 0.4));
  stamp.height = Math.max(1, Math.round(height * 0.4));
  const memory = document.createElement('canvas');
  memory.width = Math.max(1, Math.round(width * 0.4));
  memory.height = Math.max(1, Math.round(height * 0.4));
  const mctx = memory.getContext('2d');
  if (mctx) {
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, memory.width, memory.height);
  }
  return { lit, stamp, memory, memoryFade: 1, fadeAcc: 0 };
}

export interface LightFrame {
  state: State;
  scene: HTMLCanvasElement;
  /** 秒。 */
  time: number;
  reduced: boolean;
  /** 每秒余痕衰减比例（0.06 表示约 16 秒褪尽）。 */
  memoryDecay?: number;
}

/** 烛心的抖动：火不稳，光就不稳。 */
export function flickerPoint(state: State, time: number, reduced: boolean): { x: number; y: number; r: number } {
  const r = lightRadius(state.width, state.height);
  if (reduced) return { x: state.light.x, y: state.light.y, r };
  const nx = valueNoise(17, time * 2.1) - 0.5;
  const ny = valueNoise(31, time * 1.7) - 0.5;
  const breathe = 0.97 + valueNoise(47, time * 0.9) * 0.06;
  return {
    x: state.light.x + nx * r * 0.03,
    y: state.light.y + ny * r * 0.03,
    r: r * breathe,
  };
}

export function softDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.97)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.92, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  return g;
}

/** 把场景按光斑裁成软边的亮版。 */
export function buildLit(
  layer: LightLayer,
  scene: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
  cx: number,
  cy: number,
  r: number,
): void {
  const ctx = layer.lit.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, layer.lit.width, layer.lit.height);
  ctx.drawImage(scene, 0, 0, layer.lit.width, layer.lit.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = softDisc(ctx, cx, cy, r);
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** 每一帧往余痕层盖一枚光的印章，并按时间褪。 */
export function stampMemory(
  layer: LightLayer,
  scene: HTMLCanvasElement,
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
  dt: number,
  decay: number,
): void {
  const ctx = layer.memory.getContext('2d');
  if (!ctx) return;
  const sx = layer.memory.width / width;
  const sy = layer.memory.height / height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 褪：向黑里压。攒够 0.2 秒再压一次，免得每帧 0.002 的 alpha 被量化掉。
  layer.fadeAcc += dt;
  if (layer.fadeAcc >= 0.2) {
    const k = 1 - Math.exp(-decay * layer.fadeAcc);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${k.toFixed(4)})`;
    ctx.fillRect(0, 0, layer.memory.width, layer.memory.height);
    layer.fadeAcc = 0;
  }

  // 盖：把亮版场景（缩小）加进去，只加光斑附近
  // 先在一张小画布上把这一枚印章抹成软边，再「加」进余痕层
  const sctx = layer.stamp.getContext('2d');
  if (sctx) {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, layer.stamp.width, layer.stamp.height);
    // 只留亮度：不过滤的话，反复叠加会先在红通道饱和，边上出现一圈红环。
    sctx.filter = 'grayscale(1)';
    sctx.drawImage(scene, 0, 0, layer.stamp.width, layer.stamp.height);
    sctx.filter = 'none';
    sctx.globalCompositeOperation = 'destination-in';
    sctx.fillStyle = softDisc(sctx, cx * sx, cy * sy, r * sx * 1.15);
    sctx.fillRect(0, 0, layer.stamp.width, layer.stamp.height);
    sctx.globalCompositeOperation = 'source-over';
    // 取「照到过的最亮值」而不是相加：相加会在一秒内就饱和，取最大值才是记忆。
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(layer.stamp, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** 主画布：暗版打底 + 亮版 + 暖光 + 余痕。 */
export function composite(
  ctx: CanvasRenderingContext2D,
  layer: LightLayer,
  scene: HTMLCanvasElement,
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
  time: number,
  reduced: boolean,
): void {
  const dpr = ctx.canvas.width / Math.max(width, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = INK.void;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 暗版：整间屋子都在，但不抢烛光
  ctx.globalAlpha = 0.2;
  ctx.drawImage(scene, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1;

  // 亮版：光斑里
  ctx.drawImage(layer.lit, 0, 0);

  // 之后的一切都按 CSS 像素算
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 暖光：烛心的一团
  const flick = reduced ? 1 : 0.94 + valueNoise(59, time * 2.3) * 0.12;
  const glow = ctx.createRadialGradient(
    cx,
    cy,
    r * 0.05,
    cx,
    cy,
    r * (1.15 * flick),
  );
  glow.addColorStop(0, 'rgba(255,214,150,0.07)');
  glow.addColorStop(0.45, 'rgba(232,180,101,0.05)');
  glow.addColorStop(1, 'rgba(232,180,101,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // 头六秒：光斑边缘一圈细细的呼吸环，告诉观众「这圈是跟着你走的」
  const ring = Math.max(0, 1 - time / 6);
  if (ring > 0.01) {
    const pulse = 0.55 + 0.45 * Math.sin(time * 2.6);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(232,180,101,${(0.16 * ring * pulse).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.97 + 0.03 * pulse), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // 余痕
  ctx.globalAlpha = 0.42;
  ctx.drawImage(layer.memory, 0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** 边缘压暗：屋子里没有别的灯。 */
export function vignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const dpr = ctx.canvas.width / Math.max(width, 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.78,
  );
  g.addColorStop(0, 'rgba(10,9,8,0)');
  g.addColorStop(1, 'rgba(10,9,8,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
