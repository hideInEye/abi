# 探索模式待办事项重构（卡片化 + 步骤不可折叠，对齐报告模式）

## 基本信息

- 日期：2026-09-15
- 任务名称：explore-todo-report-style
- 需求文件：用户会话直接需求（调试预览待办事项样式走查，附标注截图）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression
- 任务类型：UI 样式重构

## 需求摘要

调试预览探索卡片的待办事项区样式问题：
1. 待办事项样式偏简陋，需要更美观、更贴合系统视觉。
2. 待办下内嵌的执行步骤（技能执行）不再支持折叠，直接展开展示。
3. 待办折叠样式参考 chat 报告模式（report-mode）的待办卡片。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExploreMessageRow.tsx`
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/styles.module.css`

## 参考实现

- `apps/chat/src/components/conversation/report-mode/ReportTodoList.tsx`：待办卡片 `.todoRow`（状态图标 + 标题 + 详情行状态标签 + 展开箭头）；执行步骤 `ExecutionStep` 直接展开、不折叠。
- `apps/chat/src/components/conversation/report-mode/styles.module.css`：`.todoRow / .todoMain / .todoContent / .todoDetail / .todoStateTag / .executionList / .executionStep` 视觉规范。

## 修改文件

- `ExploreMessageRow.tsx`：
  - 新增 `getTodoStatusText` / `getExecutionDetail` 辅助函数（状态中文文案、执行步骤数量描述）。
  - `ExploreStepBlock` 去掉折叠开关（移除 `expanded` / `onToggle` props 与点击/键盘切换），执行信息直接展开；标题行改为非交互的 `.stepHeader`。
  - `ExploreTodoBlock` 待办行升级为卡片头部：状态图标 + `.todoContent`（标题 `.todoText` + 详情行 `.todoDetail`：状态标签 `.todoStateTag` + 执行步骤数量）+ 展开箭头。
  - `ExploreOrphanSteps` / `ExploreTodoPanel` 同步移除步骤级折叠 props（`stepExpandedMap` / `onStepToggle`），孤儿步骤分组的展开态改为复用待办级 `todoExpandedOverride`，父组件新增 `handleGroupToggle`。
  - 主组件移除 `stepExpandedOverride` / `toggleStepExpanded` 状态。
- `styles.module.css`：
  - `.todoBlock` 升级为卡片（描边 + 圆角 12px + 浅底 + 裁切）；`.todoList` 间距 2px→8px。
  - 新增 `.todoContent / .todoDetail / .todoStateTag`；`.todoText` 去斜体、加粗为标题风格。
  - `.todoSteps` 改为报告式执行列表（顶部分隔线 + 浅蓝底 + 左缩进 40px），保留 `max-height: 320px` 内部滚动。
  - `.stepBlock` 去卡片外壳、改左侧蓝色引导线；新增 `.stepHeader`；`.stepName` 允许换行；`.stepBody` 缩进对齐 + `max-height: 280px` 滚动；删除 `.stepRow / .stepRowRunning / .stepToggleIcon`。

## 实现说明

- 步骤不可折叠后，长内容（SQL / 过程文本 / 入参）由 `.stepBody` 与 `.todoSteps` 两级限高滚动兜住，不会撑破卡片。
- 待办级「运行中自动展开、运行完自动收起」及历史探索点击选中逻辑保持不变；仅步骤级手动折叠被移除。
- 孤儿步骤分组仍可整体折叠（复用待办展开覆盖态，键为 `其他执行步骤`）。

## 测试记录

### 执行的命令

- `apps/abi` 下 `npx tsc --noEmit -p tsconfig.json`（过滤 exploration-mode / ExploreMessageRow）
- `apps/abi` 下 `npx eslint ExploreMessageRow.tsx`

### 测试结果

- tsc：改动文件零错误；项目存量基线错误均在无关文件（build/vite 配置等）。
- eslint：报出的 import/order、sort/type-properties、react/prefer-read-only-props、no-eq-null 均为存量基线问题（集中在既有 `ExploreMessageRowProps` 接口与 `planVersion != null`），本次新增接口均已按字母序排列，未新增 lint 问题。

### 失败和修复过程

- 编辑过程中一处中文注释「兜底」被误改为「兑底」，已修正。

## 回归检查

- 待办级自动展开/收起、历史探索点击选中、运行中自动滚动到执行步骤逻辑未改动。
- 访问权限、工作室入口、思考区固定高度等上一轮改动不受影响。

## Review 结果

改动均为展示层：待办/步骤组件结构与 CSS，未触碰数据流、reducer 与接口调用。

## 发现的问题

无新增。

## 本轮经验

移除组件内某一级折叠交互时，需连带清理其 state / props 链（本例 `stepExpandedMap`、`onStepToggle`、`stepExpandedOverride`）并复用上一级展开态，避免遗留死代码与类型错误。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

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

如需 chat 报告模式与 abi 探索模式待办样式长期统一，可抽取共享待办卡片组件/样式，避免两处各自维护。

## 未解决问题

无。
