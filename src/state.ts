// 状态机：只算数，不画图。单测全在这上面。

export interface Vec {
  x: number;
  y: number;
}

export interface SectionDef {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly note: string;
}

/** 五段，与《韩熙载夜宴图》原卷的顺序一致。 */
export const SECTIONS: readonly SectionDef[] = [
  { id: 0, key: 'listen', name: '一 · 听乐', note: '烛在人背后，弦在人手里' },
  { id: 1, key: 'dance', name: '二 · 观舞', note: '鼓一响，满堂的袖子都活了' },
  { id: 2, key: 'rest', name: '三 · 歇息', note: '水从指缝里过，话没有' },
  { id: 3, key: 'flute', name: '四 · 清吹', note: '五个人，一口气，吹同一个月亮' },
  { id: 4, key: 'leave', name: '五 · 散宴', note: '人走了，烛还站着' },
];

export const SECTION_COUNT = SECTIONS.length;

/** 题记门槛（AC-5）：连续停留这么久才出现；不到 800ms 一定不出现。 */
export const DWELL_SHOW_MS = 1200;
export const DWELL_HIDE_MS = 800;

/** 余痕每秒的衰减比例：半衰期约 5.8 秒，10 秒后剩不到三成（AC-6）。 */
export const MEMORY_DECAY = 0.125;

/** 余痕在 t 秒后的剩余亮度（0..1）。单测直接对着这条公式验。 */
export function memoryLevel(t: number): number {
  return Math.exp(-MEMORY_DECAY * Math.max(t, 0));
}

/** 光斑半径 = 短边 × 这个比例（AC-8）。 */
export const LIGHT_RATIO = 0.3;

/** 镜头跟随的阻尼（每秒收敛比例）。 */
export const CAMERA_DAMPING = 3.2;
export const LIGHT_DAMPING = 14;

export interface LightInput {
  /** 视口坐标，CSS px。 */
  x: number;
  y: number;
}

export interface State {
  width: number;
  height: number;
  /** 观众想去的地方（世界坐标的横向比例，0..1）。 */
  ratio: number;
  /** 指针目标点（视口坐标）。 */
  target: Vec;
  /** 缓动后的烛心。 */
  light: Vec;
  /** 镜头左边缘在世界坐标里的位置。 */
  camera: number;
  /** 当前停留的段落（-1 表示还没进入任何热区）。 */
  active: number;
  /** 在该段内的连续停留毫秒。 */
  dwell: number;
  /** 题记是否可见。 */
  noteVisible: boolean;
  /** 累计走过的世界距离，用于「举烛走过」的微光反馈。 */
  travelled: number;
}

export function lightRadius(width: number, height: number): number {
  return Math.min(width, height) * LIGHT_RATIO;
}

export function worldWidth(width: number): number {
  return width * SECTION_COUNT;
}

export function createState(width: number, height: number): State {
  const start: Vec = { x: width * 0.5, y: height * 0.5 };
  return {
    width,
    height,
    ratio: 0.1,
    target: { ...start },
    light: { ...start },
    camera: cameraTarget(0.1, width),
    active: 0,
    dwell: 0,
    noteVisible: false,
    travelled: 0,
  };
}

export function clampCamera(x: number, width: number): number {
  const max = worldWidth(width) - width;
  return Math.min(Math.max(x, 0), Math.max(max, 0));
}

/** 指针横坐标 → 段落。五等分，边界归右（0.2 落在第 2 段）。 */
export function sectionAtRatio(ratio: number): number {
  const r = Math.min(Math.max(ratio, 0), 0.999999);
  return Math.min(SECTION_COUNT - 1, Math.floor(r * SECTION_COUNT));
}

/** 指针横坐标 → 镜头左边缘（世界坐标）。观众走到哪，屋子就退到哪。 */
export function cameraTarget(ratio: number, width: number): number {
  const r = Math.min(Math.max(ratio, 0), 1);
  const world = worldWidth(width);
  return clampCamera(r * world - width / 2, width);
}

/** 光斑的屏幕横坐标：镜头把它摆在视口中央，两端除外。 */
export function lightScreenX(ratio: number, width: number): number {
  const r = Math.min(Math.max(ratio, 0), 1);
  const world = worldWidth(width);
  return r * world - cameraTarget(r, width);
}

/** 指数趋近，与帧率无关。 */
export function approach(current: number, target: number, damping: number, dt: number): number {
  const k = 1 - Math.exp(-damping * dt);
  return current + (target - current) * k;
}

export interface Input {
  target: LightInput;
  /** 真实交互过（用于隐藏提示）。 */
  engaged: boolean;
}

export function step(state: State, dt: number, input: Input | null): State {
  const next: State = { ...state, target: { ...state.target }, light: { ...state.light } };
  if (input) {
    next.target = {
      x: Math.min(Math.max(input.target.x, 0), state.width),
      y: Math.min(Math.max(input.target.y, 0), state.height),
    };
  }

  next.ratio = input
    ? Math.min(Math.max(input.target.x / Math.max(state.width, 1), 0), 1)
    : state.ratio;

  const prevLight = { ...state.light };
  const prevCamera = state.camera;
  // 纵向跟手：烛举高一点、放低一点
  next.light = {
    x: approach(state.light.x, lightScreenX(next.ratio, state.width), LIGHT_DAMPING, dt),
    y: approach(
      state.light.y,
      Math.min(Math.max(next.target.y, state.height * 0.2), state.height * 0.88),
      LIGHT_DAMPING,
      dt,
    ),
  };
  next.camera = approach(state.camera, cameraTarget(next.ratio, state.width), CAMERA_DAMPING, dt);
  next.camera = clampCamera(next.camera, state.width);
  next.travelled =
    state.travelled + Math.abs(next.camera - prevCamera) + Math.abs(next.light.y - prevLight.y);

  const idx = sectionAtRatio(next.ratio);
  if (idx === state.active) {
    next.dwell = state.dwell + dt * 1000;
  } else {
    next.dwell = 0;
    next.active = idx;
  }

  if (!next.noteVisible && next.dwell >= DWELL_SHOW_MS) next.noteVisible = true;
  if (next.noteVisible && next.dwell < DWELL_HIDE_MS) next.noteVisible = false;

  return next;
}

/** 当前段在屏幕上的横向中心（供题记对齐用）。 */
export function sectionScreenCenter(state: State, index: number): number {
  return index * state.width + state.width / 2 - state.camera;
}
