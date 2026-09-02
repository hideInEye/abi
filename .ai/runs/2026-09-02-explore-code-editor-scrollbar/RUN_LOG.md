# 探索模式代码编辑面板滚动条修复

## 基本信息

- 日期：2026-09-02
- 任务名称：explore-code-editor-scrollbar
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-02 追加：探索模式代码编辑面板滚动条修复）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：缺陷修复 / 纯样式

## 需求摘要

探索模式右侧「代码编辑」面板（ExploreCodeEditorPane）中 CodeMirror 内容超出面板高度时没有纵向滚动条，超出部分被裁切看不全。修复高度链使编辑器内部滚动。

## 影响范围

- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`
- 仅影响代码编辑面板内部高度链；工作室、报告侧栏、代码块（ExploreCodeBlock）渲染不受影响。

## 修改文件

- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`

## 实现说明

- 根因：`@uiw/react-codemirror` 渲染结构为包裹 div（`.cm-theme-light`）> `.cm-editor` > `.cm-scroller`。组件 `height="100%"` prop 与既有 CSS 都只作用于 `.cm-editor`，而包裹 div 默认高度 auto，百分比高度对 auto 父级失效，`.cm-editor` 退化为内容高度；`.codeEditorBody` 的 `overflow: hidden` 把超出部分裁切，故无滚动条。
- 修复：新增 `.codeEditorBody > :global(.cm-theme-light) { height: 100%; }`，给包裹层确定高度（`.codeEditorBody` 为 `flex: 1; min-height: 0` 的 flex 项，高度确定），使 `.cm-editor` 的 `height: 100%` 与 `.cm-scroller` 的 `height: 100% !important` + `overflow: auto` 生效，内容超出时编辑器内部出纵向滚动条。
- 未改组件 TSX、未改边框/圆角/字体/头部布局。

## 测试记录

### 执行的命令

- `npx vite build`（apps/chat）

### 测试结果

- vite build：通过（CSS Module 编译无报错），以终端输出为准。
- 本改为纯 CSS，无对应单测；exploration-mode 既有 vitest 用例不涉及样式布局。

### 失败和修复过程

无。

## 回归检查

- 代码不足一屏时：不出现滚动条；编辑器外框（边框/行号槽）撑满面板内容区（修复前外框随内容高度，现统一为面板高度，属本修复预期行为）；头部、复制 / 收起交互不变。
- 复制、收起按钮及分屏互斥逻辑未改动。
- abi 应用无 ExploreCodeEditorPane，不受影响。

## Review 结果

- 单条 CSS 规则修复高度链，无新增接口调用、无 TSX 改动，范围最小。

## 发现的问题

无新增。

## 本轮经验

- `@uiw/react-codemirror` 的 `height` prop 只设置 `.cm-editor`，外层 `.cm-theme-*` 包裹 div 仍为 auto 高度；在 flex 布局中约束编辑器高度时必须同时给包裹层确定高度（或直接把 height 设在包裹层 style 上）。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts / agents / skills / mcp / checklists

不需要。

## 后续建议

- 若后续给 python / bash 引入高亮扩展，注意长行横向滚动已由 `.cm-scroller` 的 `overflow-x: auto` 覆盖，无需额外样式。

## 未解决问题

- 编辑结果仍仅面板内本地态，不回写后端（需求未要求）。
