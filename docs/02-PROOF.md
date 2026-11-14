# 02 · 举证：它是怎么被验的

> 闸 C 的要求：全新 clone、只照 README 跑，每条验收条件配真实证据，`scripts/verify.sh` 可重复复验。

## 一、一条命令

```bash
git clone https://github.com/hkmpn9s6dh-commits/hackathon-2026-guhua && cd hackathon-2026-guhua
npm ci && bash scripts/verify.sh
```

2026-11-14 在本机（Windows 11 / Node 22.22 / Chromium 1248）实测：**verify: all green**（27 单测 / 19 项 e2e / 15 项量测 / dist 1.05 MB）。

## 二、逐条对照

| 验收条件 | 证据 | 结果 |
| --- | --- | --- |
| AC-1 全新 clone 一条命令全绿 | 上面那次运行：install → tsc → vitest → build → e2e → measure → hygiene，退出 0 | ✅ |
| AC-2 三秒内可交互 | e2e「AC-2 三秒内可交互」256 ms；帧数 > 15 | ✅ |
| AC-3 镜头随指针推进 | 单测「镜头随指针单调前进」+「指针在中间时，光斑落在画面中央」 | ✅ |
| AC-4 五段可达 | e2e 逐点 8% / 28% / 50% / 72% / 93% → 第 1–5 段；题记跟着换 | ✅ |
| AC-5 题记门槛 1200 ms | 单测「停留不到 800 ms 不出现」「超过 1200 ms 出现」；e2e 600 ms 不出现、2 s 出现 | ✅ |
| AC-6 余痕留下并按 15%/秒衰减 | 单测 `memoryLevel(10) < 0.3`；e2e 干净页面量到 30 → 141 → 48（10 秒） | ✅ |
| AC-7 运行期零外部请求 | e2e 记录全部 request，非本源请求 0 条 | ✅ |
| AC-8 手机可用、不滚动 | e2e 390×844：点一下换段、scrollY=0、无横向溢出 | ✅ |
| AC-9 可访问 | e2e 方向键换段；`prefers-reduced-motion` 下 74 帧、0 报错 | ✅ |
| AC-10 字体随包 | e2e `document.fonts.check('16px "Pinghou Serif"')` = true；dist 内含 woff2 | ✅ |
| AC-11 界面卫生 | `proof/ui/report.md`：3 个视口 × 5 类文字 = 15 项，0 问题 | ✅ |
| AC-12 素材可核 | 单测「场景图正好五张，且都是 webp」「除场景图与字体之外没有别的素材」；`docs/04-SOURCES.md` | ✅ |
| AC-13 AI 使用可核 | `docs/03-AI.md` | ✅ |
| AC-14 可复现 | 单测：同种子同序列、噪声在 0..1 | ✅ |
| AC-15 提交包五件 | 线上、仓库、创作说明（`docs/05-SUBMISSION.md`）、封面 `submission/cover-1500x1000.png`、演示片 `submission/pinghou-demo.mp4`（22 秒 / 1280×800 / H.264） | ✅ |
| AC-16 素材真的加载 | e2e：五张场景图 ok、地址是带哈希的产物、**零失败请求** | ✅ |
| AC-17 画面真的画出来 | e2e：首屏中心区均值 41/255、极差 125；五段逐段均值 51–119 | ✅ |
| AC-18 交互真的改变画面 | e2e：同一点移动指针前后 11.0 → 28.7 | ✅ |

## 三、线上

- 地址：https://hkmpn9s6dh-commits.github.io/hackathon-2026-guhua/
- 线上 e2e：`node scripts/e2e.mjs --url <上面这个地址>` → **19/19 通过**（2026-11-14 11:40）。

## 四、截图

`shots/` 八张，全部真浏览器、真构建产物、DPR 2：

| 文件 | 是什么 |
| --- | --- |
| `01-first-screen.png` | 首屏（未交互） |
| `02-listen.png` | 一 · 听乐 |
| `03-dance.png` | 二 · 观舞 |
| `04-flute.png` | 四 · 清吹 |
| `05-leave.png` | 五 · 散宴 |
| `06-memory.png` | 余痕：照过之后移开 |
| `07-phone.png` / `08-phone-tap.png` | 手机竖屏，点前 / 点后 |

## 五、线上实拍（2026-11-14 17:04）

`shots/live/01-live-first.png`（首屏）、`02-live-move.png`（移到左侧后变成「观舞」）、`03-live-dance.png`：
在**线上地址**上用真浏览器、真鼠标拍的三张，用来核对"评委打开时看到的东西"和本地一致。

## 六、一次真的翻车（记在这里，别忘）

**v2 第一版上线后是黑屏。** 原因：五张场景图的地址写成 `new URL(\`./assets/scene-${i}.webp\`, import.meta.url)`，
模板字符串 Vite 不认，构建产物里是带哈希的文件、JS 里却请求不带哈希的地址 → 五个 404 → 整屏全黑。
当时的 e2e 30 项"全过"，因为它只验了状态机、段位、余痕数值，**没验过一个像素**。
现在的 AC-16/17/18 就是补这个洞：素材必须加载成功、首屏中心不能是黑的、移动指针必须改变画面。

## 七、已知没验到的

1. **真机**：只在 Chromium 桌面与模拟手机视口验过；Safari / 微信内置浏览器 / 低端安卓未上真机。
2. **闸 D**：第 5 轮两位评委都排第 1（`proof/gate-d/README.md`），但评委保留意见是"可交互性靠那行提示"。
3. **性能**：低端机上 5 张 1600px 场景图 + 每帧全屏合成，帧率未实测。
