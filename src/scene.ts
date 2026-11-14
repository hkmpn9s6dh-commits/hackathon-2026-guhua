// 长卷：五段屋子，横着排。镜头走到哪，就画哪一两段。
// 人都不在：这一夜已经散了。每一段留下的是刚被用过的器物。

import { INK } from './palette.js';
import {
  contactShadow,
  drawScroll,
  drawVase,
  drawBasinStand,
  drawCandle,
  drawCenser,
  drawCloth,
  drawCouch,
  drawCup,
  drawCurtain,
  drawDrum,
  drawFlute,
  drawFloor,
  drawFoldedFan,
  drawMat,
  drawPillar,
  drawPipa,
  drawScreen,
  drawSpill,
  drawTable,
  type Ctx,
} from './props.js';
import { mulberry32, valueNoise } from './rng.js';
import { SECTION_COUNT, worldWidth } from './state.js';

export interface SceneParams {
  camera: number;
  width: number;
  height: number;
  /** 秒。 */
  time: number;
  reduced: boolean;
}

function flick(t: number, seed: number, reduced: boolean): number {
  if (reduced) return 1;
  return 0.86 + valueNoise(seed * 13 + 5, t * 1.7) * 0.28;
}

function sway(t: number, seed: number, reduced: boolean): number {
  if (reduced) return 0;
  return (valueNoise(seed * 29 + 11, t * 1.3) - 0.5) * 2;
}

function drawSection(ctx: Ctx, index: number, x0: number, w: number, h: number, t: number, reduced: boolean): void {
  const floorY = h * 0.82;
  const rnd = mulberry32(1000 + index * 37);
  const P = (u: number) => x0 + w * u;

  // 屋：地、帷幔、梁、柱
  ctx.fillStyle = '#0d0a08';
  ctx.fillRect(x0, 0, w, h);
  drawFloor(ctx, x0, floorY, w, h * 0.18);
  drawCurtain(ctx, x0 + w * 0.5, 0, w * 1.04, h * 0.2, 7 + index);
  ctx.fillStyle = 'rgba(141,116,82,0.06)';
  ctx.fillRect(x0, h * 0.2, w, 2);
  drawPillar(ctx, x0, h, h, w * 0.011);
  drawPillar(ctx, x0 + w, h, h, w * 0.011);

  switch (index) {
    case 0: {
      // 一 · 听乐：琵琶还倚在榻边，弦上有人按过
      drawScreen(ctx, P(0.14), floorY + h * 0.02, h * 0.46);
      drawMat(ctx, P(0.56), floorY + h * 0.05, w * 0.72, h * 0.07, rnd);
      drawCouch(ctx, P(0.62), floorY + h * 0.02, w * 0.3, h * 0.14);
      drawPipa(ctx, P(0.4), floorY + h * 0.07, h * 0.44, -0.36);
      drawTable(ctx, P(0.82), floorY + h * 0.03, w * 0.16, h * 0.1);
      drawCenser(ctx, P(0.82), floorY + h * 0.025, h * 0.026, t);
      drawCandle(ctx, P(0.46), floorY + h * 0.06, h * 0.3, flick(t, index, reduced), sway(t, index, reduced));
      drawCup(ctx, P(0.72), floorY - h * 0.1, h * 0.022);
      contactShadow(ctx, P(0.62), floorY + h * 0.03, w * 0.22, h * 0.03, 0.6);
      contactShadow(ctx, P(0.36), floorY + h * 0.075, w * 0.09, h * 0.024, 0.5);
      drawScroll(ctx, P(0.78), floorY + h * 0.005, w * 0.09, 0.06);
      break;
    }
    case 1: {
      // 二 · 观舞：鼓还支着，扇子落在地上
      drawScreen(ctx, P(0.94), floorY + h * 0.02, h * 0.4, 8, true);
      drawMat(ctx, P(0.44), floorY + h * 0.05, w * 0.84, h * 0.07, rnd);
      drawDrum(ctx, P(0.7), floorY + h * 0.06, h * 0.105);
      drawFoldedFan(ctx, P(0.42), floorY + h * 0.02, h * 0.12, 0.28, 0.55);
      drawTable(ctx, P(0.2), floorY + h * 0.03, w * 0.14, h * 0.09);
      drawCandle(ctx, P(0.2), floorY + h * 0.06, h * 0.22, flick(t, index, reduced), sway(t, index, reduced));
      drawCandle(ctx, P(0.54), floorY + h * 0.05, h * 0.16, flick(t, index + 3, reduced), sway(t, index, reduced));
      drawCup(ctx, P(0.32), floorY - h * 0.02, h * 0.02, true);
      contactShadow(ctx, P(0.7), floorY + h * 0.06, w * 0.08, h * 0.02, 0.55);
      drawVase(ctx, P(0.86), floorY + h * 0.005, h * 0.16);
      break;
    }
    case 2: {
      // 三 · 歇息：盆里的水还没静，巾搭在沿上
      drawScreen(ctx, P(0.1), floorY + h * 0.02, h * 0.42);
      drawMat(ctx, P(0.52), floorY + h * 0.05, w * 0.6, h * 0.06, rnd);
      drawBasinStand(ctx, P(0.52), floorY + h * 0.02, h * 0.1, h * 0.24);
      drawCloth(ctx, P(0.6), floorY - h * 0.22, h * 0.12, h * 0.22, 0.22);
      drawSpill(ctx, P(0.46), floorY + h * 0.01, h * 0.06);
      drawCandle(ctx, P(0.86), floorY + h * 0.06, h * 0.26, flick(t, index, reduced), sway(t, index, reduced));
      drawCenser(ctx, P(0.3), floorY + h * 0.04, h * 0.024, t);
      contactShadow(ctx, P(0.52), floorY + h * 0.02, w * 0.1, h * 0.026, 0.6);
      drawScroll(ctx, P(0.72), floorY + h * 0.008, w * 0.08, -0.04);
      break;
    }
    case 3: {
      // 四 · 清吹：五支笛还摆在席上，一支倒地
      drawScreen(ctx, P(0.04), floorY + h * 0.02, h * 0.38);
      drawMat(ctx, P(0.5), floorY + h * 0.05, w * 0.82, h * 0.08, rnd);
      for (let i = 0; i < 4; i += 1) {
        drawFlute(ctx, P(0.28 + i * 0.15), floorY + h * 0.03 - i * h * 0.004, h * 0.26, 0.06);
      }
      drawFlute(ctx, P(0.62), floorY + h * 0.02, h * 0.24, -0.42);
      drawTable(ctx, P(0.78), floorY + h * 0.03, w * 0.16, h * 0.1);
      drawCandle(ctx, P(0.76), floorY + h * 0.06, h * 0.24, flick(t, index, reduced), sway(t, index, reduced));
      drawCup(ctx, P(0.66), floorY - h * 0.09, h * 0.02);
      contactShadow(ctx, P(0.5), floorY + h * 0.04, w * 0.28, h * 0.03, 0.45);
      drawVase(ctx, P(0.9), floorY + h * 0.005, h * 0.14);
      break;
    }
    case 4: {
      // 五 · 散宴：席空着，杯倒了，两支烛快灭了
      drawMat(ctx, P(0.3), floorY + h * 0.05, w * 0.28, h * 0.055, rnd);
      drawMat(ctx, P(0.62), floorY + h * 0.06, w * 0.24, h * 0.05, rnd);
      drawTable(ctx, P(0.48), floorY + h * 0.03, w * 0.2, h * 0.09);
      drawCup(ctx, P(0.42), floorY - h * 0.09, h * 0.022, true);
      drawCup(ctx, P(0.54), floorY - h * 0.06, h * 0.02);
      drawCup(ctx, P(0.26), floorY - h * 0.02, h * 0.018, true);
      drawSpill(ctx, P(0.38), floorY + h * 0.01, h * 0.07);
      drawCandle(ctx, P(0.18), floorY + h * 0.06, h * 0.24, flick(t, index, reduced) * 0.5, sway(t, index, reduced));
      drawCandle(ctx, P(0.66), floorY + h * 0.06, h * 0.16, 0.22, 0);
      drawCenser(ctx, P(0.78), floorY + h * 0.04, h * 0.024, t);
      drawFoldedFan(ctx, P(0.72), floorY + h * 0.02, h * 0.075, -0.5, 0.35);
      contactShadow(ctx, P(0.48), floorY + h * 0.03, w * 0.12, h * 0.026, 0.5);
      break;
    }
    default:
      break;
  }
}

/** 画当前视口能看到的部分（含左右各半段余量）。 */
export function drawScene(ctx: Ctx, p: SceneParams): void {
  const { camera, width: w, height: h, time: t, reduced } = p;
  const world = worldWidth(w);
  ctx.save();
  ctx.fillStyle = INK.void;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(-camera, 0);

  for (let i = 0; i < SECTION_COUNT; i += 1) {
    const x0 = i * w;
    if (x0 + w < camera - w * 0.05 || x0 > camera + w + w * 0.05) continue;
    drawSection(ctx, i, x0, w, h, t, reduced);
  }

  ctx.fillStyle = INK.void;
  ctx.fillRect(-w * 0.02, 0, w * 0.02, h);
  ctx.fillRect(world, 0, w + w * 0.02, h);
  ctx.restore();
}

/** 绢纹：一小块噪点，平铺。只在光里看得见。 */
export function makeSilkTile(size = 128): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(20261130);
  for (let i = 0; i < size * size; i += 1) {
    const v = rnd();
    const grain = v > 0.985 ? 40 : v > 0.75 ? 10 : 0;
    img.data[i * 4 + 0] = 232;
    img.data[i * 4 + 1] = 196;
    img.data[i * 4 + 2] = 140;
    img.data[i * 4 + 3] = grain;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(232,196,140,0.04)';
  for (let i = 0; i < 40; i += 1) {
    const y = rnd() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (rnd() - 0.5) * 3);
    ctx.stroke();
  }
  return c;
}
