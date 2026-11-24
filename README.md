# 电子课程设计仿真工作台

在线电子课程设计仿真平台的界面原型，覆盖数字电路、模拟电路、电力电子、51 单片机与 STM32 五个方向。当前阶段只完成网页界面与交互框架，仿真内核、HEX 烧录执行与 AI 网表生成逻辑尚未接入。

## 在线预览

- 部署地址：<https://37lq98livj3r1ydtzxh.traesite.cn>
- 当前访问策略：仅自己可见。如需公开访问，请在部署面板中把访问策略调整为“所有人可见”。

## 当前完成内容

- **项目工作台**：五个仿真域入口、示例工程、最近工程。
- **数电工作台**：74LS161 + 74LS47 + 七段数码管示例、器件库、检查器、逻辑分析仪、AI 网表入口。
- **模拟电路工作台**：共射放大电路、静态工作点、双通道示波器、探针与测量。
- **电力电子工作台**：Buck 12V → 5V 示例、MOSFET/二极管/电感/电容功率级、示波器纹波与效率测量。
- **51 单片机工作台**：STC89C52RC 最小系统、P1 流水灯、HEX 固件面板、SFR 快照、串口终端。
- **STM32 工作台**：STM32F103C8T6 Blue Pill、PC13 闪烁、固件面板、寄存器视图、USART 终端。
- **AI 网表**：紧凑文本、自然语言、JSON 三种格式的界面与一键复制交互，当前内容为示例数据。

所有页面都是静态 HTML/CSS，可直接在浏览器打开；页面使用 CDN 加载 Tailwind CSS 与 Lucide 图标，首次打开需要联网。

## 目录结构

```text
design/electronic-lab/
├─ electronic-lab.design            # Trae Design 画布入口（页面节点、交互、画布布局）
├─ colors_and_type.css              # 金色时光设计令牌 + 应用端样式
├─ generation-tree.json             # 页面生成树记录
├─ runtime-orchestration-summary.json
├─ validation-report.json           # 最近一次设计校验报告
├─ pages/
│  ├─ project-hub.html              # 项目工作台（部署入口）
│  ├─ workspace-digital.html        # 数电工作台
│  ├─ workspace-analog.html         # 模拟电路工作台
│  ├─ workspace-power.html          # 电力电子工作台
│  ├─ workspace-mcu51.html          # 51 单片机工作台
│  ├─ workspace-mcu-stm32.html      # STM32 工作台
│  └─ ai-netlist.html               # AI 网表导出抽屉
└─ partials/
   └─ schematic-symbols.svg         # 开源元件符号 sprite（已内联进页面）
```

## 本地查看

直接打开：

```bash
open design/electronic-lab/pages/project-hub.html
```

或启动一个静态服务器（避免部分浏览器对本地文件的限制）：

```bash
cd design/electronic-lab
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000/pages/project-hub.html
```

部署入口使用 `pages/project-hub.html` 的副本 `index.html`，所以也可以把 `design/electronic-lab/pages/` 整体作为静态站点发布，并将项目工作台重命名为 `index.html`。

## 如何修改

### 1. 修改页面内容

页面主体都在 `pages/*.html` 的 `<main>` 中。可以直接编辑文字、表格、示例数据和 SVG 原理图。

注意：每个页面的 `<head>` 由设计系统的 head 注入脚本生成，包含 Tailwind/Lucide CDN、`theme-vars`、语义令牌回退和主题类。**建议只改 `<main>` 内容**；如果确实要改 `<head>`，修改后重新执行下面的 head 注入命令。

### 2. 修改颜色、字体、圆角与布局

统一修改 `colors_and_type.css`：

- 顶部 `:root` 是颜色、字体、圆角、阴影、间距令牌。
- 中间是按钮、芯片标签、面板、工作台网格、画布、检查器、示波器、AI 抽屉等组件样式。
- 响应式断点集中在文件底部。

修改 CSS 后，需要把新的样式重新内联到所有页面：

```bash
# 根据本机 Trae Design 插件位置调整
export TRAE_DESIGN_SKILL=/data/user/plugins/trae-remote-official/trae-design/0.1.3/skills/solo-design

node "$TRAE_DESIGN_SKILL/shared-runtime/deterministic-tooling/apply-html-head-contract.mjs" \
  design/electronic-lab/colors_and_type.css \
  design/electronic-lab/pages/*.html \
  --replace-head --prefix=golden
```

该命令会保留每个页面的 `<main>`，重新生成 `<head>`。

### 3. 修改或增加元件符号

`schematic-symbols.svg` 中的 `<symbol>` 来自 MIT 许可的开源项目 [schematic-symbols](https://github.com/tscircuit/schematic-symbols)，包含电阻、电容、电感、二极管、LED、三极管、MOSFET、IGBT、SCR、运放、开关、电位器、按键等符号。

页面中的用法：

```html
<svg viewBox="0 0 48 30" aria-hidden="true">
  <use href="#sym-resistor-right" x="3" y="6" width="42" height="18"
       color="var(--golden-chart-2)"></use>
</svg>
```

新增符号时：

1. 在 `partials/schematic-symbols.svg` 的 `<defs>` 中添加 `<symbol id="sym-xxx" viewBox="...">`。
2. 在页面中通过 `<use href="#sym-xxx">` 引用。
3. 如果页面还没有该 sprite，把 sprite 内联到页面 `<body>` 开头（页面已有的 `class="symbol-sprite"` 节点就是它）。

芯片、板卡和七段数码管是页面内直接绘制的 SVG，可在对应页面的 `<main>` 中调整缺口、引脚、标签与尺寸。

### 4. 修改交互与页面跳转

- 页面中需要跳转的元素带有 `data-dom-id="..."`。
- `electronic-lab.design` 的 `devMetadata.interactions` 描述 `domId → targetPageId` 的关系。
- 新增页面时，需要同时添加页面节点、HTML 文件、交互关系；页面节点 `id` 必须与 `pages/<slug>.html` 对应。
- `.design` 中的 `canvasData`、`layoutSnapshot` 由 Trae Design 画布维护，通常不需要手动修改。

### 5. 修改后校验

```bash
export TRAE_DESIGN_SKILL=/data/user/plugins/trae-remote-official/trae-design/0.1.3/skills/solo-design

node "$TRAE_DESIGN_SKILL/shared-runtime/deterministic-tooling/validate-design-workspace.mjs" \
  design/electronic-lab \
  --expected-pages=7 \
  --report-json=design/electronic-lab/validation-report.json

node "$TRAE_DESIGN_SKILL/shared-runtime/deterministic-tooling/validate-finish-readiness.mjs" \
  design/electronic-lab --check=all
```

校验会检查 `.design` 页面注册、HTML 结构、head 基础设施、硬编码颜色、交互 domId、图片路径等。

## 如何继续开发仿真能力

当前是纯界面原型。后续实现路线见 [实施计划](.trae/documents/在线电子课设仿真平台-实施计划.md)。

建议的技术栈与顺序：

1. **前端工程化**：React 19 + Vite + TypeScript，Zustand 管理文档/仿真/UI 状态，Tailwind CSS v4。
2. **统一原理图数据模型**：器件、引脚、导线、网络（并查集提网）、撤销/重做、localStorage 持久化。
3. **数字电路引擎**：事件驱动、四态/三态/开集电极、74LS/CD4000 器件模型、逻辑分析仪。
4. **模拟/电力电子引擎**：用 `brownout` 的 MNA 求解器做适配，接入示波器、万用表与工作点分析。
5. **51 单片机**：自研 MCS-51 内核（SFR、定时器、UART、中断、准双向口）+ Intel HEX 解析与烧录面板。
6. **STM32**：用 `stm32f1-emu` 的 WASM 适配 STM32F103C8T6，绑定 GPIO/UART 事件。
7. **AI 网表**：把当前设计页面的示例文本替换为真实的 `buildAiNetlist(doc, library, snapshot, checks)`，支持复制与下载。
8. **测试**：Vitest 覆盖网络提取、74LS 器件、51 指令集、模拟 RC/整流/Buck、AI 导出快照。

实现时优先复用当前设计系统的视觉规范：暖奶油底、墨棕文字、橄榄辅助色、橙色信号强调、较大圆角外框与细边框分层。

## 如何使用这个原型

1. 打开项目工作台，从五个仿真域中选择一个，或直接点击示例工程。
2. 通过顶栏的“数电 / 模电 / 电力电子 / 51 / STM32”标签切换工作台。
3. 在画布中查看示例接线；右侧检查器查看参数、引脚、检查结果。
4. 在数电/模拟/电力电子工作台底部查看逻辑分析仪或示波器。
5. 在 51/STM32 工作台右侧查看固件面板与寄存器，底部查看串口终端。
6. 点击顶栏或检查器中的“AI 网表”，切换三种格式并复制示例文本。

当前所有运行、烧录、复制后的仿真结果均为界面示例，不会真正驱动电路。按钮会提示“仿真引擎将在下一阶段接入”。

## 部署与更新

本项目是静态站点，入口为 `pages/project-hub.html`。

- 在线地址：<https://37lq98livj3r1ydtzxh.traesite.cn>
- 如需重新部署，在 Trae 中使用部署插件，将 `design/electronic-lab/pages/` 作为静态站点的 `public/` 内容，并把 `project-hub.html` 复制为 `index.html`。
- 当前部署为“仅自己可见”；需要分享时调整访问策略为“所有人可见”。

## 许可与第三方

- 仓库代码：GPL-3.0（见根目录 `LICENSE`）。
- 元件符号：`schematic-symbols`，MIT License，Copyright (c) 2024 tscircuit。
- 设计令牌来源：Golden Time 设计库（只读引用）。
- 页面运行时使用 Tailwind CSS 与 Lucide 的 CDN 版本。
