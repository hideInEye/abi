# 探索模式性能优化 + 助手分享面板 5 项修复 Run Log

## 基本信息

- 日期：2026-09-02
- 任务名称：explore-perf-and-chatwidget-fixes
- 需求文件：无正式需求文件，用户口头需求（对话内提出）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test、Regression
- 任务类型：性能优化 / Bug 修复

## 需求摘要

1. 探索模式打开已完成结果 / 分屏滑出动画卡顿（报告模式不卡），要求修复且不影响报告模式。
2. 助手分享面板（ChatWidget）5 个问题：用户气泡短文本换行、用户与 AI 消息间距过大、面板尺寸偏小、对话结束缺"描述分析"小节、中途停止后发送 icon 不恢复。

## 影响范围

- 仅 `apps/chat` 的探索模式组件、conversation 分屏壳的探索分支、chat-widget。
- 报告模式（report-mode）零改动；交互模式对话零改动。

## 修改文件

性能（探索模式）：

- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`
  - 删除 `.card` / `.pane` 的 `backdrop-filter`（背景不透明度提高补偿），消除"卡内任何重绘都整块重新采样模糊"的绘制放大器。
  - 删除全部 infinite 动画（statusDot 呼吸、todoStatusRunning 脉冲、skillRowRunning 光晕、thinkingPending 光晕、thinkingBoxRunning 光点、runningHint 扫描线），消除空闲态持续重绘。
  - `.codeBlockBody pre` / `.richText pre` / `.dataTable` 改 `width: max-content; min-width: 100%`（宽度隔离：布局不随分屏列宽变化，动画期间不逐帧重排；移动端媒体查询收回 100%）。
  - 移除曾实验性添加的 `.card` 静态 `content-visibility`（估高修正导致 CLS 与滚动落地顿挫）。
- `apps/chat/src/components/conversation/exploration-mode/ExploreCodeBlock.tsx`：React.memo 自定义比较器 + onEditRef（父级整棵重渲染时跳过 Prism 重新高亮）。
- `apps/chat/src/components/conversation/exploration-mode/ExploreRichText.tsx`：React.memo 自定义比较器（跳过 ReactMarkdown 重新解析）。
- `apps/chat/src/components/conversation/exploration-mode/ExploreMessageRow.tsx`：thinkingOverflow 的 ResizeObserver 改 rAF 节流（消除强制同步重排）；thinkingBox 运行态 class 拆分。
- `apps/chat/src/components/conversation/exploration-mode/ExplorePreviewPane.tsx`：新增 `frozenWidth` prop，动画期间面板内宽冻结。
- `apps/chat/src/components/conversation/index.tsx`：`bodyRef` + `exploreFrozenWidth` 状态与 phase 效应（opening/closing 按 body 宽 48% 冻结，open 后 400ms 解除），传参给 ExplorePreviewPane。

ChatWidget：

- `apps/chat/src/components/chat-widget/index.css`：panel 420×640→480×720、float 396→440；`.abi-cw-msg-human` 明确 `width: 100%` 打破收缩ToFit 循环；复用 HumanEle 的根 margin 归零、隐藏占位操作条。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：`backfillFromView` 返回 `!!view.desc`（仅回补图表时仍回退流内正文，修"描述分析"缺失）；`handleStop` 主动 `setSending(false)` + `patchMsg({ streaming: false })`（service 对 AbortError 静默不回调 onError）。

## 实现说明

性能根因分三层，前几轮只覆盖了后两层的一部分，最终轮补齐第一层后才达标：

1. 空闲持续重绘：探索卡内 infinite filter/box-shadow 动画 + backdrop-filter，使页面无交互时也每帧重绘（帧轨道连续掉帧、GPU 行持续活动的来源）。报告模式两者皆无。
2. 分屏 width 动画逐帧重排：壳宽 0→48% 逐帧变化时，左卡 Prism 代码块、右面板 markdown/表格跟着逐帧重排。对策=重 DOM 宽度隔离（固有宽度）+ 面板内宽冻结（外壳裁切揭示）。报告右侧是 iframe，天然免疫。
3. 重内容挂载与重渲染：打开时 ReactMarkdown/Prism/CodeMirror 同步挂载、MessageList 整棵重渲染触发重新解析。对策=memo 比较器 + RO rAF 节流。曾尝试延后挂载（330ms 占位），因用户要求"立刻打开"且逐帧重排修复后同步挂载不再压动画而回退。

## 测试记录

### 执行的命令

- `cd apps/chat; npx tsc -p tsconfig.app.json --noEmit`（每轮改动后执行）

### 测试结果

- 改动文件 0 错误；仅存改动前既有的 `src/components/conversation/autoChart/multi-measure-pie-chart.ts(72,*)` TS1005/TS1161 语法错误（与本轮无关，未处理）。
- 用户真机手感验证：探索打开/分屏动画由"很卡"→"快了不少"→"好多了"（最终轮确认）。
- ChatWidget 5 项修复已 tsc 验证，用户未逐项回复验证结果（转入性能问题）。

### 失败和修复过程

- 多轮诊断偏差：先猜右栏挂载（骨架屏延后）→ 用户仍卡；再猜左栏重渲染（memo）→ 缓解；再猜毛玻璃（Console 禁用测试）→ 排除单因；最终靠 Performance 摘要 + 帧轨道连续掉帧特征定位"空闲持续重绘"层。教训：先区分连续重绘与事件驱动重绘，再定位。
- 静态 `content-visibility: auto` 引入 CLS（0.22→0.39），回退删除。
- 延后挂载造成"内容延迟出现"，按用户反馈回退为同步挂载。

## 回归检查

- 报告模式：未改任何 report-mode 文件；分屏壳 CSS 未动（冻结逻辑仅作用于探索面板 prop）。
- 交互模式对话：未动。
- 视觉差异（已向用户明示）：小圆点/待办/扫描线静态化；毛玻璃改高不透明度白底；工作室滑出改裁切揭示；移动端表格恢复换行适配。

## Review 结果

- 全部改动限定探索/chat-widget 范围；无新增接口调用；无大范围重构。
- `exploreFrozenWidth` 仅在桌面端（>900px）生效，移动端跳过冻结避免破坏窄屏适配。

## 发现的问题

- `multi-measure-pie-chart.ts` 既有语法错误使 tsc exit 1，属历史遗留，建议单独任务修复。
- 用户环境 F12 被占用、DevTools 为中文版（已入记忆）。

## 本轮经验

- 性能排查对照法：同壳不同内容的报告（快）vs 探索（卡）是最有效对照组，差异点即根因（iframe 隔离、轻 DOM、无常驻动画）。
- 对话卡内禁止 infinite filter/box-shadow 动画与 backdrop-filter：它们把"偶发重绘"放大为"持续重绘"。
- width 分屏动画期间，重 DOM 用固有宽度隔离、面板用内宽冻结，可把逐帧重排降为一次布局。

## 是否需要更新 AI 系统

### 需要更新的 context

- 建议在 `.ai/context/CODE_STYLE.md` 或 UI 规范中补一条性能红线：对话/卡片组件内禁用 infinite filter 动画与 backdrop-filter（涉及全局样式约定，需人工确认后落地，本轮未自动改）。

### 需要更新的 prompts

- 不需要。

### 需要更新的 agents

- 不需要。

### 需要更新的 skills

- 不需要。

### 需要更新的 MCP 建议

- 不需要。

### 需要更新的 checklists

- 可选：完成前检查清单加"性能类改动需区分连续重绘/事件重绘并对照轻量页面录 Performance"。

## 后续建议

- 若动画期间左卡文字逐帧重排仍被感知，备选方案：对话内探索卡改报告式轻量摘要卡（重工作区仅存于工作室），属 UX 级改动需先确认。
- 修复 `multi-measure-pie-chart.ts` 既有语法错误。

## 未解决问题

- ChatWidget 5 项修复待用户逐项真机确认。
- 无 E2E/性能自动化门禁，性能验证依赖用户真机录 Performance。
