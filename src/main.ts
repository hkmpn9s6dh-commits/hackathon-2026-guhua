import './styles.css';
import { INK } from './palette.js';
import { createLightLayer, buildLit, composite, flickerPoint, stampMemory, vignette, type LightLayer } from './light.js';
import { drawScene, makeSilkTile } from './scene.js';
import { createState, MEMORY_DECAY, sectionAtRatio, SECTIONS, step, type State } from './state.js';

const stage = document.querySelector<HTMLCanvasElement>('#stage');
const note = document.querySelector<HTMLDivElement>('#note');
const noteName = document.querySelector<HTMLElement>('#note-name');
const noteText = document.querySelector<HTMLElement>('#note-text');
const hint = document.querySelector<HTMLElement>('#hint');
const ticks = document.querySelector<HTMLElement>('#ticks');
const live = document.querySelector<HTMLElement>('#live');

if (!stage) throw new Error('canvas #stage 不在');
const ctx = stage.getContext('2d');
if (!ctx) throw new Error('拿不到 2d context');

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;
reducedQuery.addEventListener('change', (e) => {
  reduced = e.matches;
});

const scene = document.createElement('canvas');
const sceneCtx = scene.getContext('2d');
if (!sceneCtx) throw new Error('拿不到场景 context');

let dpr = 1;
let sceneScale = 1;
let layer: LightLayer | null = null;
let state: State = createState(window.innerWidth, window.innerHeight);
let silk: HTMLCanvasElement | null = null;
void silk;
let engaged = false;
let lastSection = -1;

function layout(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  sceneScale = Math.min(dpr, 1.5);

  stage!.width = Math.round(w * dpr);
  stage!.height = Math.round(h * dpr);
  stage!.style.width = `${w}px`;
  stage!.style.height = `${h}px`;

  scene.width = Math.round(w * sceneScale);
  scene.height = Math.round(h * sceneScale);

  // 只在尺寸真的变了时重建，别把状态洗掉
  const sameSize = Math.abs(w - state.width) < 1 && Math.abs(h - state.height) < 1;
  state = sameSize ? state : { ...createState(w, h), active: state.active, dwell: state.dwell };
  layer = createLightLayer(w, h, dpr);
  if (!silk) silk = makeSilkTile();
}

/** 把场景画进离屏画布，再叠一层绢纹。 */
function paintScene(time: number): void {
  sceneCtx!.setTransform(1, 0, 0, 1, 0, 0);
  sceneCtx!.scale(sceneScale, sceneScale);
  drawScene(sceneCtx!, {
    camera: state.camera,
    width: state.width,
    height: state.height,
    time,
    reduced,
  });
  // 绢纹只在光里出现，压在最后一步（见 light.composite），不铺满整张场景。
  sceneCtx!.setTransform(1, 0, 0, 1, 0, 0);
}

function syncNote(): void {
  const show = engaged && state.noteVisible && state.active >= 0;
  note?.classList.toggle('is-on', show);
  if (!show) return;
  const s = SECTIONS[state.active];
  if (!s) return;
  if (noteName) noteName.textContent = s.name;
  if (noteText) noteText.textContent = s.note;
}

function syncTicks(): void {
  if (!ticks) return;
  if (ticks.children.length !== SECTIONS.length) {
    ticks.replaceChildren(
      ...SECTIONS.map((s) => {
        const el = document.createElement('span');
        el.className = 'tick';
        el.dataset.section = String(s.id);
        el.title = s.name;
        return el;
      }),
    );
  }
  for (const el of Array.from(ticks.children)) {
    if (!(el instanceof HTMLElement)) continue;
    el.classList.toggle('is-on', Number(el.dataset.section) === state.active);
  }
}

function syncLive(): void {
  if (state.active === lastSection) return;
  lastSection = state.active;
  const s = SECTIONS[state.active];
  if (s && live) live.textContent = `${s.name}。${s.note}`;
  stage?.setAttribute('data-section', String(state.active));
  stage?.setAttribute('data-section-key', s ? s.key : '');
}

function moveTo(clientX: number, clientY: number): void {
  if (!engaged) {
    engaged = true;
    hint?.classList.add('is-gone');
  }
  state.target = { x: clientX, y: clientY };
}

window.addEventListener(
  'pointermove',
  (e) => {
    moveTo(e.clientX, e.clientY);
  },
  { passive: true },
);

window.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0];
    if (t) moveTo(t.clientX, t.clientY);
  },
  { passive: true },
);

window.addEventListener('pointerdown', (e) => {
  moveTo(e.clientX, e.clientY);
});

window.addEventListener('keydown', (e) => {
  const stepPx = Math.max(24, state.width * 0.04);
  const cur = state.target;
  let next: { x: number; y: number } | null = null;
  if (e.key === 'ArrowRight') next = { x: cur.x + stepPx, y: cur.y };
  if (e.key === 'ArrowLeft') next = { x: cur.x - stepPx, y: cur.y };
  if (e.key === 'ArrowUp') next = { x: cur.x, y: cur.y - stepPx };
  if (e.key === 'ArrowDown') next = { x: cur.x, y: cur.y + stepPx };
  if (!next) return;
  e.preventDefault();
  moveTo(next.x, next.y);
});

window.addEventListener('resize', () => {
  layout();
});

let last = performance.now();
let clock = 0;
let frames = 0;

function frame(now: number): void {
  const dtRaw = (now - last) / 1000;
  last = now;
  const dt = Math.min(Math.max(dtRaw, 0), 1 / 20);
  clock += dt;
  frames += 1;

  state = step(state, dt, engaged ? { target: state.target, engaged } : null);
  paintScene(clock);

  if (layer) {
    const f = flickerPoint(state, clock, reduced);
    buildLit(layer, scene, state.width, state.height, dpr, f.x, f.y, f.r);
    stampMemory(layer, scene, state.width, state.height, f.x, f.y, f.r, dt, MEMORY_DECAY);
    composite(ctx!, layer, scene, state.width, state.height, f.x, f.y, f.r, clock, reduced);
    vignette(ctx!, state.width, state.height);
  }

  syncNote();
  syncTicks();
  syncLive();

  document.body.dataset.frames = String(frames);
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);

// 首帧之后把「已就绪」标出来，给 e2e 与主人一个确定的信号。
requestAnimationFrame(() => {
  document.body.classList.add('is-ready');
});

// 供 e2e 读的几个数字（不参与画面）
Object.defineProperty(window, '__pinghou', {
  value: {
    get state(): State {
      return state;
    },
    get frames(): number {
      return frames;
    },
    get clock(): number {
      return clock;
    },
    sectionAtRatio,
    palette: INK,
    /** 余痕层在某点的亮度（0..255），给 e2e 用。 */
    sampleMemory(x: number, y: number): number {
      if (!layer) return 0;
      const c = layer.memory.getContext('2d');
      if (!c) return 0;
      const sx = Math.round((x / state.width) * layer.memory.width);
      const sy = Math.round((y / state.height) * layer.memory.height);
      const d = c.getImageData(Math.min(Math.max(sx, 0), layer.memory.width - 1), Math.min(Math.max(sy, 0), layer.memory.height - 1), 1, 1).data;
      return (d[0] ?? 0) + (d[1] ?? 0) + (d[2] ?? 0);
    },
  },
  writable: false,
});
