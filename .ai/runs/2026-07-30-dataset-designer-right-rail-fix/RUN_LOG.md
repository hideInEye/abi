# 数据集编辑页右侧维度/指标栏跨浏览器消失修复 Run Log

## 基本信息

- 日期：2026-07-30
- 任务名称：dataset-designer-right-rail-fix
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-07-30 追加段）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Regression、Review、Knowledge
- 任务类型：前端缺陷修复（布局/样式）

## 需求摘要

数据集编辑页（`data-collection-operate/[id].tsx`）在三个浏览器上布局表现不一致，最严重时右侧 40px「维度/指标」导航条整体消失。需在不改业务逻辑的前提下，保证任意浏览器/任意窗口宽度下右侧导航条始终可见且文字正常显示。

## 根因分析

1. **Splitter 缺少 `minWidth: 0`**：外层 Splitter 只写了 `flex: 1; minHeight: 0`。flex 子项默认 `min-width: auto`，其 min-content 宽度由内容决定；antd Splitter（5.21.6）的 Panel 在 ResizeObserver 首次测量容器后把 `flex-basis` 写死为像素值（`flexGrow: 0`）。这些固定 flex-basis 计入 Splitter 整体 min-content 宽度，形成死锁：外层想压窄 Splitter → `min-width: auto` 不让压 → Splitter 宽度不变 → 其 ResizeObserver 收不到变窄事件 → 面板尺寸永不重算 → 右侧 `flexShrink: 0` 的 40px 导航条被顶出 `.container { overflow: hidden }` 可视区。"flex 项 min-content contribution 如何被 flex-basis / overflow: auto 钳制"是浏览器 flexbox 互操作性最差的一块，故三个浏览器三种表现。
2. **`defaultSize` 传字符串**：`defaultSize="220"` / `"300"` 首帧（容器未测量时）被 antd 直接塞进 `flexBasis`，生成非法 CSS `flex-basis: 220`（无单位），首帧由内容自然撑开，各浏览器首帧宽度不同。
3. **竖排文字依赖 `writing-mode`**：右侧导航条用 `writing-mode: vertical-lr + text-orientation: upright + SimHei`，老内核浏览器对该组合渲染不稳定，可能导致文字不显示（截图 3 的疑似成因之一）。

## 影响范围

- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/[id].tsx`
- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/DesignerRightPanel.tsx`

## 修改文件

- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/[id].tsx`
  - 外层 Splitter `style` 增加 `minWidth: 0`，切断收缩死锁。
  - 左面板 `Splitter.Panel` `defaultSize="220"` → `defaultSize={220}`，并增加 `min={160}`。
  - 底部预览 `Splitter.Panel` `defaultSize="300"` → `defaultSize={300}`。
- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/DesignerRightPanel.tsx`
  - 竖排标题由 `writing-mode: vertical-lr` 方案改为 flex 纵向逐字块（`item.name.split('').map(...)`），不再依赖 `writing-mode/text-orientation`，视觉一致但兼容性更强。

## 实现说明

核心修复是 `minWidth: 0`：这是 CSS 规范定义的行为（显式 min-width 覆盖 auto），不依赖浏览器"善意"。改后无论哪个浏览器如何计算 min-content，Splitter 都必须让出空间，右侧 40px 导航条数学上不可能再被顶出。面板内部本就是 `overflow: auto`，压窄后内容滚动不会烂版。竖排逐字块作为兜底，堵死"导航条在原位但文字没渲染"的第二种可能。

## 测试记录

### 执行的命令

- `pnpm --filter <abi> typecheck`（`tsc --noEmit --skipLibCheck`）
- `GetProblems`（语言服务未就绪，改用 typecheck 验证）

### 测试结果

- typecheck 全量输出中，本次修改的两个文件（`[id].tsx`、`DesignerRightPanel.tsx`）零报错。
- 其余报错（qiankunStore、locales、rc-menu、group-selection.test 等）均为仓库既有的 pre-existing 报错，与本次改动无关。

### 失败和修复过程

无。改动一次通过类型检查。

## 回归检查

- 右侧 `DesignerRightPanel` 交互（点击展开维度/指标、字段互转 handleSwitch、点击外部收起）逻辑未改动。
- Splitter 拖拽、SQL/图形化模式切换、保存流程未改动。
- 左面板增加 `min={160}` 仅限制拖拽最小宽度，默认宽度 220 不变。
- 竖排标题改为逐字块后视觉与原竖排一致（字号、字重、字体一致，靠 flex 纵向排列）。

## Review 结果

改动全部集中在布局/样式，未触碰数据流、API、状态。`minWidth: 0` 与 `defaultSize` 数字化为标准修复；逐字块方案为纯展示层，零业务风险。

## 发现的问题

- 截图 3 的白条有两种可能（导航条被顶出 / 竖排文字未渲染），本次两条路一并堵死，需用户在出问题的浏览器上验证确认。
- 仓库存在大量 pre-existing typecheck 报错，非本任务范围。

## 本轮经验

- antd Splitter 外层容器务必显式加 `minWidth: 0`（横向）/ `minHeight: 0`（纵向），否则 flex 子项 `min-width: auto` + Panel 固定 flex-basis 会导致收缩死锁，把兄弟节点顶出 overflow:hidden 容器，且各浏览器表现不一致。
- antd Splitter.Panel 的 `defaultSize` 应传数字，字符串数字会在首帧生成无单位非法 flex-basis。
- 竖排中文标题若需跨老内核浏览器兼容，用 flex 纵向逐字块比 `writing-mode: vertical-lr` 更稳。

## 是否需要更新 AI 系统

### 需要更新的 context

可考虑在 UI/样式规范中补充"Splitter 布局必须加 minWidth/minHeight: 0"一条（已在长期记忆中沉淀）。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

右侧导航条“挤出去”的真实环境经用户澄清是 **Safari（WebKit）**，非联想/Chrome。Chrome 与联想 SLBrowser（Chromium 141）实测均已正常。`min-width:0` 为 CSS 标准行为，WebKit 同样遵守，理论上已修复；但因本机无 Safari，尚未真机验证。建议后续用 Mac/iPhone Safari 或在线服务（如 BrowserStack）实测确认。

## 未解决问题

- Safari（WebKit）下右侧维度/指标栏是否仍被挤出：尚无真机验证。若验证仍复现，备选兑底方案为将右侧栏改为绝对定位贴右 + 中间区域留 40px，完全不依赖 flex 收缩。

---

## 追加：页面内容区右间距跨浏览器不一致（同日）

### 现象

Chrome/Edge 页面内容区右侧有间距，联想浏览器没有，内容贴死右边缘。

### 根因

`.page-content-area` 本身没有设计 padding，右侧间距完全来自 `scrollbar-gutter: stable` 预留的滚动条槽。该属性需 Chromium 94+；Chrome/Edge 支持故预留出“间距”，联想浏览器老内核不认该属性、不预留，所以贴边。这也与上文诊断数据 `.container` 与内容区 `rectRight` 均等于窗口宽一致。

### 修复

`apps/abi/src/layouts/modules/global-content/style.css`：新增 `@supports not (scrollbar-gutter: stable)` 块，仅对不支持该属性的老内核给 `.page-content-area` 补 `padding-right: 12px`。支持 scrollbar-gutter 的 Chrome/Edge 不进入该分支，保持原样，零回归。

### 本轮经验

`scrollbar-gutter: stable` 常被当“防滚动条跳动”用，但它同时会在新内核上预留出一条槽，视觉上等同于右间距；老内核不支持时会表现为“没有间距”。若间距是设计诉求，不应依赖 scrollbar-gutter 产生，应用显式 padding + `@supports` 回退。

### 订正（同日，以真机数据为准）

上面“根因/修复/本轮经验”三段的判断错误，以本订正为准：

- **错误判断**：曾认为联想浏览器是老内核、不支持 scrollbar-gutter，并用 `@supports not (scrollbar-gutter: stable)` 补 padding。
- **真机数据推翻**：联想 SLBrowser UA 为 `SLBrowser/9.0` + `Chrome/141`，`CSS.supports('scrollbar-gutter: stable')` 返回 `true`，`computed scrollbarGutter = stable` —— 它**完全支持** scrollbar-gutter，所以 `@supports not(...)` 分支根本不命中，`padding-right` 为 `0px`，修复无效。
- **真正根因**：`scrollbar-gutter: stable` 预留的槽只有在“经典滚动条”（占布局宽度）时才有宽度。联想用 **overlay 覆盖式滚动条**（实测 `offsetWidth - clientWidth = 0`），槽宽为 0 → 无间距；Chrome/Edge 用经典滚动条，槽宽 ~15px → 有间距。与内核新旧无关，取决于滚动条类型。
- **最终修复**：删除 `scrollbar-gutter` 与 `@supports not` 块，`.page-content-area` 直接用 `padding-right: 12px`，三浏览器右间距恒为 12px。
- **已知代价**（用户已确认接受）：去掉 scrollbar-gutter 后，Chrome/Edge 在内容区自身滚动的页面上，滚动条出现时会有一次 ~15px 横向跳动。
- **纠正后经验**：不能仅凭 UA/商标名判定“老内核”；`scrollbar-gutter` 的槽宽取决于浏览器用的是经典还是 overlay 滚动条，需用 `offsetWidth - clientWidth` 实测，不能靠猜。
