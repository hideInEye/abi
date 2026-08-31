# 探索模式实时思考区高度限制回归修复

日期：2026-08-31

## 背景

用户反馈：探索模式卡片左侧「正在深度思考」（实时思考）区域高度不限制，长思考内容把卡片无限往下撑开（交互稿红框要求：高度固定、内容滚动）。该问题之前修复过，本次为回归。

## 回归原因

提交 `aaee716`（探索模式样式修改）将 `.thinkingCollapsibleInner` 原有的 `max-height: 96px` 限高删除，改为 `flex: 1; min-height: 0` 的「左栏 1:1 等分 + 内部滚动」方案。但外层 `.cardWorkspace` 是 auto 高度的 grid（仅 `min-height: 360px`），grid 行高由两列内容的 max-content 撑开，flex 的 `min-height: 0` 只在容器高度确定时才起作用，因此思考区高度约束完全失效，长思考再次撑开卡片。

## 修改文件

- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`
  - `.thinkingCollapsibleInner` 补回 `max-height: 440px` 兜底限高（与右栏 `.currentResultBody` 桌面端限高一致），展开时内部滚动、收起时裁切渐隐行为不变，并补注释说明限高兜底原因。
  - `@media (max-width: 900px)` 内同步 `.thinkingCollapsibleInner { max-height: 52vh; }`，与移动端结果栏 52vh 规范一致。

## 行为等价说明

- 右栏结果区、待办区、工作室侧栏、折叠/展开交互、自动滚底逻辑均未改动。
- 思考区在左栏 50% 等分小于 440px 时仍按等分布局填充；仅当内容超长时由 max-height 截断并内部滚动（运行中已有自动滚底 effect）。

## 验证

- 静态检查：CSS 仅新增两条 max-height 规则与注释，无选择器/语法变更；GetProblems 无报错（语言服务未就绪时以人工核对替代）。
- 无法运行真实流式会话验证，需人工在探索模式发起一次长思考任务确认：思考区高度固定、内部滚动、卡片不再被撑开。

## 二次修正（用户反馈：实时思考独占整栏，应和历史一样占一半）

原因：无待办时思考面板是唯一子元素，同时命中 `.todoColumn .panel:first-child`（flex: 0 0 50%）与 `.todoColumn .panel:last-child`（flex: 1 1 auto），后者后写生效，导致思考区独占整栏。

- `styles.module.css` 新增 `.todoColumn .panel:first-child:last-child { flex: 0 0 50%; }`（特异性更高），无待办时思考区仍保持半高，与历史视图 1:1 布局一致。

## 最终方案（用户反馈：思考增长/待办出现仍会撑开卡片）

根因：`.cardWorkspace` 是 auto 高度 grid，行高由两列内容 max-content 决定，此前所有补丁（flex 等分、max-height 兜底）都只能限单块上限，无法阻止内容增长撑高工作区。对照旧版 91af967（思考区 max-height: 96px 直限）与交互稿「高度固定，内容滚动」要求，最终改为固定工作区高度：

- `.cardWorkspace`：`min-height: 360px` → `height: 560px`（桌面端固定高，思考区/待办/右栏结果各自内部滚动）。
- `@media (max-width: 900px)`：`.cardWorkspace { height: auto; }` 移动端恢复内容撑高 + 各块 52vh 限高。
- 保留 `.todoColumn .panel:first-child:last-child { flex: 0 0 50% }`（无待办时思考区半高）与 `.thinkingCollapsibleInner` 的 max-height 兜底（桌面 440px / 移动 52vh）。

效果：卡片高度恒定 560px，实时思考增长、待办出现均不再撑开/挤压卡片，与历史视图 1:1 布局一致。

## 补充修正（待办出现仍往下挤一些）

根因：`height: 560px` 只固定容器，grid 隐式行是 auto 轨道，待办全量行高的 max-content 仍会把轨道撑过 560 溢出。

- `.cardWorkspace` 增加 `grid-template-rows: minmax(0, 1fr)`，行轨道钉死为容器高度；移动端媒体查询重置为 `grid-template-rows: auto`。

## 高度优化（用户反馈：单条 AI 消息超出页面）

- `.cardWorkspace` 高度由固定 560px 改为 `clamp(360px, calc(100vh - 480px), 560px)`：矮屏自动收窄保证单条消息不超页面，高屏上限 560px；行轨道 minmax(0,1fr) 随行高生效，内部滚动行为不变。

## 后续建议

- 若后续再调整探索模式布局：桌面端 `.cardWorkspace` 必须保持与内容无关的高度约束（clamp 视口自适应 + grid-template-rows: minmax(0, 1fr)；auto/min-height 会让内容撑开卡片）；不得删除 `.thinkingCollapsibleInner` 的 max-height 兜底与 `.panel:first-child:last-child` 半高规则。
