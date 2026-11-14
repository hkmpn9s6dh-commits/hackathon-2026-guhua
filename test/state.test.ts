import { describe, expect, it } from 'vitest';
import {
  approach,
  cameraTarget,
  clampCamera,
  createState,
  DWELL_HIDE_MS,
  DWELL_SHOW_MS,
  LIGHT_RATIO,
  lightRadius,
  lightScreenX,
  MEMORY_DECAY,
  memoryLevel,
  sectionAtRatio,
  SECTIONS,
  step,
  worldWidth,
} from '../src/state.js';

const W = 1440;
const H = 900;

/** 按住不动地过 ms 毫秒：指针停在当前比例对应的位置上。 */
function ticks(state: ReturnType<typeof createState>, ms: number, dt = 1 / 60) {
  let s = state;
  const n = Math.round(ms / (dt * 1000));
  const hold = { x: s.ratio * s.width, y: s.target.y };
  for (let i = 0; i < n; i += 1) s = step(s, dt, { target: hold, engaged: true });
  return s;
}

describe('镜头与光斑', () => {
  it('世界宽 = 五段', () => {
    expect(worldWidth(W)).toBe(W * 5);
    expect(SECTIONS).toHaveLength(5);
  });

  it('镜头不会越界', () => {
    expect(clampCamera(-100, W)).toBe(0);
    expect(clampCamera(1e9, W)).toBe(worldWidth(W) - W);
  });

  it('指针在中间时，光斑落在画面中央', () => {
    expect(lightScreenX(0.5, W)).toBeCloseTo(W / 2, 5);
  });

  it('两端时，光斑贴边而不是跑到画外', () => {
    expect(lightScreenX(0, W)).toBeGreaterThanOrEqual(0);
    expect(lightScreenX(1, W)).toBeLessThanOrEqual(W);
  });

  it('镜头随指针单调前进', () => {
    const xs = [0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => cameraTarget(r, W));
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
    }
  });

  it('缓动与帧率无关：一步 0.1 秒 ≈ 两步 0.05 秒', () => {
    const a = approach(0, 100, 4, 0.1);
    const b = approach(approach(0, 100, 4, 0.05), 100, 4, 0.05);
    expect(a).toBeCloseTo(b, 6);
  });

  it('光斑半径随短边缩放', () => {
    expect(lightRadius(1440, 900)).toBeCloseTo(900 * LIGHT_RATIO, 5);
    expect(lightRadius(390, 844)).toBeCloseTo(390 * LIGHT_RATIO, 5);
  });
});

describe('五段', () => {
  it('横坐标五等分，边界归右', () => {
    expect(sectionAtRatio(0)).toBe(0);
    expect(sectionAtRatio(0.199)).toBe(0);
    expect(sectionAtRatio(0.2)).toBe(1);
    expect(sectionAtRatio(0.5)).toBe(2);
    expect(sectionAtRatio(0.99)).toBe(4);
    expect(sectionAtRatio(1)).toBe(4);
  });

  it('越界的输入被夹住', () => {
    expect(sectionAtRatio(-3)).toBe(0);
    expect(sectionAtRatio(9)).toBe(4);
  });

  it('每一段都有名字与题记，且题记不超过 18 字', () => {
    for (const s of SECTIONS) {
      expect(s.name.length).toBeGreaterThan(2);
      expect(s.note.length).toBeGreaterThan(4);
      expect(s.note.length).toBeLessThanOrEqual(18);
    }
  });
});

describe('题记门槛（AC-5）', () => {
  it('停留不到 800ms 不出现', () => {
    let s = createState(W, H);
    s = ticks(s, 700);
    expect(s.noteVisible).toBe(false);
  });

  it('停留超过 1200ms 出现', () => {
    let s = createState(W, H);
    s = ticks(s, DWELL_SHOW_MS + 120);
    expect(s.active).toBe(0);
    expect(s.noteVisible).toBe(true);
  });

  it('换段之后重新计时', () => {
    let s = createState(W, H);
    s = ticks(s, DWELL_SHOW_MS + 120);
    expect(s.noteVisible).toBe(true);
    s = { ...s, ratio: 0.5, target: { x: W * 0.5, y: H * 0.5 } };
    s = ticks(s, 200);
    expect(s.active).toBe(2);
    expect(s.dwell).toBeLessThan(DWELL_HIDE_MS);
    expect(s.noteVisible).toBe(false);
  });
});

describe('余痕（AC-6）', () => {
  it('十秒后剩不到三成', () => {
    expect(memoryLevel(0)).toBeCloseTo(1, 6);
    expect(memoryLevel(10)).toBeLessThan(0.3);
  });

  it('单调递减，且不会被负数放大', () => {
    expect(memoryLevel(5)).toBeLessThan(memoryLevel(4));
    expect(memoryLevel(-10)).toBeCloseTo(1, 6);
    expect(MEMORY_DECAY).toBeGreaterThan(0);
  });
});

describe('状态推进', () => {
  it('没有输入时，画面自己也稳定（不会漂）', () => {
    let s = createState(W, H);
    const c0 = s.camera;
    const l0 = { ...s.light };
    for (let i = 0; i < 120; i += 1) s = step(s, 1 / 60, null);
    expect(s.camera).toBeCloseTo(c0, 4);
    expect(s.light.x).toBeCloseTo(l0.x, 4);
    expect(s.light.y).toBeCloseTo(l0.y, 4);
  });

  it('纵向跟手，但被夹在 20%–88% 之间', () => {
    let s = createState(W, H);
    s = step(s, 0.5, { target: { x: W * 0.5, y: -200 }, engaged: true });
    for (let i = 0; i < 200; i += 1) s = step(s, 1 / 60, { target: s.target, engaged: true });
    expect(s.light.y).toBeGreaterThanOrEqual(H * 0.2 - 1);
    s = step(s, 0.5, { target: { x: W * 0.5, y: H * 3 }, engaged: true });
    for (let i = 0; i < 200; i += 1) s = step(s, 1 / 60, { target: s.target, engaged: true });
    expect(s.light.y).toBeLessThanOrEqual(H * 0.88 + 1);
  });
});
