// 长卷：五段屋子，横着排。画是真画过的——五张工笔场景，随包带走。
// 这一段只负责「把哪一段画在哪儿」，光与记忆在 light.ts。

import { INK } from './palette.js';
import { SECTION_COUNT, worldWidth } from './state.js';

export interface SceneParams {
  camera: number;
  width: number;
  height: number;
  /** 秒。 */
  time: number;
  reduced: boolean;
}

/** 五张场景图，按段落顺序。 */
const SCENE_URLS = [1, 2, 3, 4, 5].map(
  (i) => new URL(`./assets/scene-${i}.webp`, import.meta.url).href,
);

export interface SceneArt {
  images: HTMLImageElement[];
  ready: boolean;
}

export function createArt(): SceneArt {
  const images = SCENE_URLS.map((url) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    return img;
  });
  return { images, ready: false };
}

export async function loadArt(art: SceneArt): Promise<void> {
  await Promise.all(art.images.map((img) => (img.decode ? img.decode().catch(() => undefined) : undefined)));
  art.ready = art.images.every((img) => img.complete && img.naturalWidth > 0);
}

/** 等比铺满一个视口。 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** 两段之间的接缝：一道由暗到透的竖影，读作两道墙之间的夹道。 */
function drawSeam(ctx: CanvasRenderingContext2D, x: number, h: number, w: number): void {
  const band = w * 0.09;
  const left = ctx.createLinearGradient(x - band, 0, x, 0);
  left.addColorStop(0, 'rgba(8,7,6,0)');
  left.addColorStop(1, 'rgba(8,7,6,0.9)');
  ctx.fillStyle = left;
  ctx.fillRect(x - band, 0, band, h);

  const right = ctx.createLinearGradient(x, 0, x + band, 0);
  right.addColorStop(0, 'rgba(8,7,6,0.9)');
  right.addColorStop(1, 'rgba(8,7,6,0)');
  ctx.fillStyle = right;
  ctx.fillRect(x, 0, band, h);
}

/** 画当前视口能看到的部分。 */
export function drawScene(ctx: CanvasRenderingContext2D, p: SceneParams, art: SceneArt): void {
  const { camera, width: w, height: h } = p;
  const world = worldWidth(w);

  ctx.save();
  ctx.fillStyle = INK.void;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < SECTION_COUNT; i += 1) {
    const x0 = i * w - camera;
    if (x0 + w < -w * 0.02 || x0 > w + w * 0.02) continue;
    const img = art.images[i];
    if (img && img.naturalWidth > 0) {
      drawCover(ctx, img, x0, 0, w, h);
    } else {
      ctx.fillStyle = '#151009';
      ctx.fillRect(x0, 0, w, h);
    }
    if (i > 0) drawSeam(ctx, x0, h, w);
  }

  // 两端封住
  ctx.fillStyle = INK.void;
  ctx.fillRect(-w * 0.02, 0, w * 0.02 + Math.min(camera, w * 0.02), h);
  ctx.fillRect(world - camera - w * 0.02, 0, w * 0.04, h);
  ctx.restore();
}
