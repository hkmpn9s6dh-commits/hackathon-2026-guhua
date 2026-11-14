// 器物与空间：屏风、席、案、烛台、鼓、琵琶、盆、笛、扇、帷幔、香炉。
// 全部程序化，无一张位图（AC-12）。

import { INK } from './palette.js';
import { mulberry32 } from './rng.js';

export type Ctx = CanvasRenderingContext2D;

const ink = (a: number): string => `rgba(20,16,12,${a})`;

/** 屏风：六扇，缝在页与页之间；屏面上有一痕远山。 */
export function drawScreen(ctx: Ctx, x: number, y: number, h: number, panels = 8, flip = false): void {
  const panelW = h * 0.225;
  const w = panelW * panels;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  // 屏面
  ctx.fillStyle = '#3b2c1e';
  ctx.fillRect(-w / 2, -h, w, h);
  // 每扇的边框与缝
  for (let i = 0; i < panels; i += 1) {
    const px = -w / 2 + i * panelW;
    ctx.strokeStyle = 'rgba(141,116,82,0.18)';
    ctx.lineWidth = Math.max(1, h * 0.003);
    ctx.strokeRect(px + h * 0.012, -h + h * 0.012, panelW - h * 0.024, h - h * 0.024);
    ctx.fillStyle = ink(0.5);
    ctx.fillRect(px + panelW - h * 0.004, -h, h * 0.008, h);
  }
  // 上下横档
  ctx.fillStyle = 'rgba(96,74,50,0.95)';
  ctx.fillRect(-w / 2, -h, w, h * 0.018);
  ctx.fillRect(-w / 2, -h * 0.02, w, h * 0.02);
  // 屏面上的远山：一条折线，极淡
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, -h * 0.42);
  for (let i = 1; i <= 9; i += 1) {
    const t = i / 9;
    const px = -w * 0.44 + t * w * 0.88;
    const py = -h * 0.42 - Math.sin(t * Math.PI * 1.7) * h * 0.1 - (i % 2 ? h * 0.03 : 0);
    ctx.lineTo(px, py);
  }
  ctx.strokeStyle = 'rgba(96,140,150,0.38)';
  ctx.lineWidth = Math.max(1, h * 0.004);
  ctx.stroke();
  // 底座
  ctx.fillStyle = ink(0.9);
  ctx.fillRect(-w / 2 - h * 0.02, 0, w + h * 0.04, h * 0.03);
  ctx.restore();
}

/** 席：编织的地衣，只画一层斜纹与边缘。 */
export function drawMat(ctx: Ctx, x: number, y: number, w: number, h: number, rnd: () => number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(74,56,40,0.7)';
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2 + h * 0.18, -h);
  ctx.lineTo(w / 2 - h * 0.18, -h);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,138,96,0.22)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 14; i += 1) {
    const t = i / 14;
    const px = -w / 2 + t * w;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px * 0.96, -h);
    ctx.stroke();
  }
  for (let i = 1; i < 5; i += 1) {
    const py = -h * (i / 5);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + h * 0.18 * (i / 5), py);
    ctx.lineTo(w / 2 - h * 0.18 * (i / 5), py);
    ctx.stroke();
  }
  void rnd;
  ctx.restore();
}

/** 矮案。 */
export function drawTable(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2b2019';
  ctx.fillRect(-w / 2, -h, w, h * 0.16);
  ctx.fillStyle = ink(0.95);
  ctx.fillRect(-w / 2 + w * 0.06, -h + h * 0.16, w * 0.04, h * 0.84);
  ctx.fillRect(w / 2 - w * 0.1, -h + h * 0.16, w * 0.04, h * 0.84);
  ctx.fillStyle = 'rgba(141,116,82,0.1)';
  ctx.fillRect(-w / 2, -h, w, Math.max(1, h * 0.02));
  ctx.restore();
}

/** 烛台。flame 0..1 控制火苗高度，flick 用于左右摇。 */
export function drawCandle(
  ctx: Ctx,
  x: number,
  y: number,
  h: number,
  flame = 1,
  flick = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = ink(0.95);
  ctx.fillRect(-h * 0.012, -h, h * 0.024, h);
  ctx.beginPath();
  ctx.ellipse(0, 0, h * 0.07, h * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();
  // 蜡盘
  ctx.beginPath();
  ctx.ellipse(0, -h, h * 0.055, h * 0.016, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2c22';
  ctx.fill();
  // 火苗
  const fh = h * 0.052 * flame;
  const sway = flick * h * 0.012;
  const grad = ctx.createRadialGradient(sway, -h - fh * 0.5, 0, sway, -h - fh * 0.5, fh * 2.2);
  grad.addColorStop(0, 'rgba(255,242,210,0.95)');
  grad.addColorStop(0.35, 'rgba(232,180,101,0.6)');
  grad.addColorStop(1, 'rgba(232,180,101,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(sway, -h - fh * 0.55, fh * 0.62, fh * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 鼓：立鼓，鼓面朝侧前方。 */
export function drawDrum(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = ink(0.95);
  ctx.fillRect(-r * 0.06, -r * 1.1, r * 0.12, r * 1.1);
  ctx.fillRect(-r * 0.5, -r * 0.06, r, r * 0.06);
  ctx.beginPath();
  ctx.ellipse(0, -r * 1.15, r * 0.52, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4a3428';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -r * 1.15, r * 0.44, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(104,86,66,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,16,12,0.6)';
  ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.stroke();
  ctx.restore();
}

/** 琵琶：梨形音箱 + 直颈 + 四弦。 */
export function drawPipa(ctx: Ctx, x: number, y: number, h: number, angle = -0.25): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(h * 0.16, -h * 0.1, h * 0.15, -h * 0.34, h * 0.06, -h * 0.42);
  ctx.lineTo(-h * 0.06, -h * 0.42);
  ctx.bezierCurveTo(-h * 0.15, -h * 0.34, -h * 0.16, -h * 0.1, 0, 0);
  ctx.closePath();
  ctx.fillStyle = '#4a3428';
  ctx.fill();
  ctx.fillStyle = ink(0.95);
  ctx.fillRect(-h * 0.028, -h * 0.86, h * 0.056, h * 0.46);
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo((i - 1.5) * h * 0.012, -h * 0.84);
    ctx.lineTo((i - 1.5) * h * 0.012, -h * 0.02);
    ctx.strokeStyle = 'rgba(232,222,208,0.28)';
    ctx.lineWidth = Math.max(0.6, h * 0.004);
    ctx.stroke();
  }
  ctx.restore();
}

/** 盆（捧在手里的 wash basin）。 */
export function drawBasin(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2c22';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.04, r * 0.78, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(47,93,107,0.35)';
  ctx.fill();
  ctx.restore();
}

/** 笛：一根细管，斜着。 */
export function drawFlute(ctx: Ctx, x: number, y: number, len: number, angle = -0.12): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(0, -len * 0.012, len, len * 0.024);
  ctx.fillStyle = ink(0.7);
  for (let i = 1; i < 6; i += 1) {
    ctx.fillRect((len * i) / 7, -len * 0.012, len * 0.008, len * 0.024);
  }
  ctx.restore();
}

/** 团扇。 */
export function drawFan(ctx: Ctx, x: number, y: number, r: number, angle = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(122,106,86,0.5)';
  ctx.fill();
  ctx.fillStyle = ink(0.9);
  ctx.fillRect(-r * 0.03, r * 0.9, r * 0.06, r * 0.8);
  ctx.restore();
}

/** 帷幔：从屋梁垂下，褶皱是一列正弦。 */
export function drawCurtain(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.translate(x, y);
  const folds = 9;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  for (let i = 0; i <= folds; i += 1) {
    const t = i / folds;
    const px = -w / 2 + t * w;
    const drop = h * (0.86 + 0.14 * Math.sin(t * Math.PI * 3 + rnd() * 0.2));
    ctx.lineTo(px, drop);
  }
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(26,20,16,0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(141,116,82,0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i < folds; i += 1) {
    const px = -w / 2 + (i / folds) * w;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** 香炉：三足小鼎，一缕烟。 */
export function drawCenser(ctx: Ctx, x: number, y: number, r: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.5, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2c22';
  ctx.fill();
  ctx.fillStyle = ink(0.9);
  ctx.fillRect(-r * 0.7, -r * 0.1, r * 0.12, r * 0.35);
  ctx.fillRect(r * 0.58, -r * 0.1, r * 0.12, r * 0.35);
  ctx.fillRect(-r * 0.08, -r * 0.05, r * 0.16, r * 0.3);
  // 烟
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.05);
  for (let i = 1; i <= 8; i += 1) {
    const tt = i / 8;
    ctx.lineTo(Math.sin(tt * 4 + t * 0.6) * r * 0.28, -r * 1.05 - tt * r * 1.6);
  }
  ctx.strokeStyle = 'rgba(232,222,208,0.07)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.restore();
}

/** 地砖：只在光里看得见的砖缝。 */
export function drawFloor(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(141,116,82,0.09)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i += 1) {
    const px = x + (i / 6) * w;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px - w * 0.05, y + h);
    ctx.stroke();
  }
  for (let i = 1; i <= 3; i += 1) {
    const py = y + (i / 3) * h;
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }
  ctx.restore();
}

/** 柱子：只在两道墙的接缝处出现，帮观众数段落。 */
export function drawPillar(ctx: Ctx, x: number, y: number, h: number, w: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(18,14,11,0.98)';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = 'rgba(141,116,82,0.07)';
  ctx.fillRect(x - w / 2, y - h, w * 0.28, h);
  ctx.fillStyle = INK.silkDeep;
  ctx.fillRect(x - w * 0.7, y - h * 0.03, w * 1.4, h * 0.03);
  ctx.restore();
}

/** 榻：抬高的坐具，四条腿，上面一层席。 */
export function drawCouch(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  // 台面
  ctx.fillStyle = '#3a2b1e';
  ctx.fillRect(-w / 2, -h, w, h * 0.16);
  ctx.fillStyle = 'rgba(214,178,124,0.5)';
  ctx.fillRect(-w / 2, -h, w, Math.max(1.5, h * 0.028));
  // 腿
  ctx.fillStyle = ink(0.96);
  for (const dx of [-w * 0.42, w * 0.42]) {
    ctx.fillRect(dx - w * 0.018, -h + h * 0.14, w * 0.036, h * 0.86);
  }
  // 凭几
  ctx.strokeStyle = 'rgba(74,52,40,0.95)';
  ctx.lineWidth = Math.max(2, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h * 1.06);
  ctx.quadraticCurveTo(0, -h * 1.16, w * 0.22, -h * 1.04);
  ctx.stroke();
  ctx.restore();
}

/** 盆架：三足圆架，上面一只盆。 */
export function drawBasinStand(ctx: Ctx, x: number, y: number, r: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(58,44,32,0.9)';
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  for (const a of [-0.5, 0.5, Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.62, -h);
    ctx.lineTo(Math.cos(a) * r * 1.05, 0);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -h * 0.55);
  ctx.lineTo(r * 0.8, -h * 0.55);
  ctx.stroke();
  drawBasin(ctx, 0, -h, r);
  ctx.restore();
}

/** 巾：搭在盆沿上的一块布。 */
export function drawCloth(ctx: Ctx, x: number, y: number, w: number, h: number, angle = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.bezierCurveTo(-w * 0.2, h * 0.18, w * 0.1, h * 0.06, w / 2, h * 0.2);
  ctx.lineTo(w * 0.42, h);
  ctx.bezierCurveTo(w * 0.1, h * 0.86, -w * 0.2, h * 0.98, -w * 0.46, h * 0.8);
  ctx.closePath();
  ctx.fillStyle = '#6d5a44';
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,180,101,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, h * 0.1);
  ctx.lineTo(-w * 0.24, h * 0.86);
  ctx.stroke();
  ctx.restore();
}

/** 酒渍：席上一块深色。 */
export function drawSpill(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.32, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,18,12,0.55)';
  ctx.fill();
  ctx.restore();
}

/** 屏风后的灯：一团从屏面背后透出来的暖光。 */
export function drawLampGlow(ctx: Ctx, x: number, y: number, r: number, strength = 1): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(232,180,101,${0.22 * strength})`);
  g.addColorStop(0.5, `rgba(232,180,101,${0.09 * strength})`);
  g.addColorStop(1, 'rgba(232,180,101,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** 折扇：散宴时落在地上，半开。 */
export function drawFoldedFan(ctx: Ctx, x: number, y: number, r: number, angle: number, open = 0.6): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const a0 = -open * Math.PI;
  const a1 = 0;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, a0, a1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(122,106,86,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,16,12,0.6)';
  ctx.lineWidth = Math.max(1, r * 0.02);
  for (let i = 0; i <= 8; i += 1) {
    const a = a0 + ((a1 - a0) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

/** 杯：正放或倒扣。散宴最轻的证据。 */
export function drawCup(ctx: Ctx, x: number, y: number, r: number, tipped = false): void {
  ctx.save();
  ctx.translate(x, y);
  if (tipped) ctx.rotate(-1.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4a382c';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.26, r * 0.88, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,9,8,0.72)';
  ctx.fill();
  ctx.restore();
}

/** 器物底下的接触阴影：没有它，所有东西都像浮在地上。 */
export function contactShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(6,5,4,${a})`);
  g.addColorStop(0.7, `rgba(6,5,4,${a * 0.5})`);
  g.addColorStop(1, 'rgba(6,5,4,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 一只花瓶/梅瓶：细颈、丰肩。 */
export function drawVase(ctx: Ctx, x: number, y: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-h * 0.1, 0);
  ctx.bezierCurveTo(-h * 0.26, -h * 0.3, -h * 0.22, -h * 0.62, -h * 0.09, -h * 0.72);
  ctx.lineTo(-h * 0.11, -h * 0.86);
  ctx.lineTo(h * 0.11, -h * 0.86);
  ctx.lineTo(h * 0.09, -h * 0.72);
  ctx.bezierCurveTo(h * 0.22, -h * 0.62, h * 0.26, -h * 0.3, h * 0.1, 0);
  ctx.closePath();
  ctx.fillStyle = '#3d4a48';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,170,120,0.18)';
  ctx.lineWidth = Math.max(1, h * 0.008);
  ctx.beginPath();
  ctx.moveTo(-h * 0.16, -h * 0.36);
  ctx.quadraticCurveTo(0, -h * 0.3, h * 0.16, -h * 0.38);
  ctx.stroke();
  ctx.restore();
}

/** 一只卷轴：横放在席上，绢边露出来。 */
export function drawScroll(ctx: Ctx, x: number, y: number, len: number, angle = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(-len / 2, -len * 0.03, len, len * 0.06);
  ctx.fillStyle = '#7a2a1e';
  ctx.fillRect(-len / 2, -len * 0.045, len * 0.04, len * 0.09);
  ctx.fillRect(len / 2 - len * 0.04, -len * 0.045, len * 0.04, len * 0.09);
  ctx.restore();
}
