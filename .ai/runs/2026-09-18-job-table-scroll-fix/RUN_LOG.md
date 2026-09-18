# 定时任务/调度日志列表滚动条修复（对齐数据集实现）

## 基本信息

- 日期：2026-09-18
- 任务名称：job-table-scroll-fix
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（定时任务重构接入 XXL-JOB 调度中心接口，第 5 条：保持现有页面样式）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：缺陷修复 / 样式回归

## 需求摘要

用户反馈重构后的定时任务、调度日志列表在内容未超出可视区域时就出现纵向滚动条，且表格下方留有大段空白；要求对照数据集页面实现修复。

## 影响范围

- `apps/abi/src/pages/workbench/job/time/index.tsx`
- `apps/abi/src/pages/workbench/job/log/index.tsx`
- 不影响 `useTableScroll` hook 本身及其他使用方（manage/post、manage/role-auth、manage/group）。

## 修改文件

- `apps/abi/src/pages/workbench/job/time/index.tsx`
- `apps/abi/src/pages/workbench/job/log/index.tsx`

## 实现说明

根因：两页面使用 `useTableScroll()` 计算 `scroll.y`（`window.innerHeight - rect.top - 230`）传给 `ATable`。antd 在设置 `scroll.y` 后表体成为独立滚动容器（`overflow-y: scroll` + `max-height`）：Windows 下即使内容不溢出也常驻滚动条轨道；且硬编码 offset 使 `y` 比 flex 容器实际可用高度小约 200px，导致内容提前溢出出滚动条、同时表格外框（flex:1）下方留出空白。

数据集页面（`data-preparation/data-collection/index.tsx`）不设 `scroll.y`，仅 `scroll={{ x: 'max-content' }}`，纵向溢出交给外层 `.assistant-table-scroll`（`overflow: auto; maxHeight: 100%`）容器，滚动条仅在内容真正超出时出现。

修复：两页面移除 `useTableScroll()` 调用与 `tableWrapperRef`，`scroll` 仅保留 `x: 'max-content'`，与数据集实现一致。

## 测试记录

### 执行的命令

- `node apps/abi/node_modules/eslint/bin/eslint.js`（在 `apps/abi` 目录下对两个改动文件执行）
- `npx tsc --noEmit -p tsconfig.json`（在 `apps/abi` 目录下，过滤 `workbench/job`）
- `pnpm test -- apps/abi/src/service/api/job-mock.test.ts apps/abi/src/service/api/job.test.ts apps/abi/src/pages/workbench/job/utils.test.ts`

### 测试结果

- ESLint：改动行无新增 error/warning；文件内既有 prettier/import-order/no-nested-ternary 等基线问题保持原样未动。
- tsc：`job/time/index.tsx`、`job/log/index.tsx` 无类型错误；其余 job 目录错误为既有基线（cron-expression-drawer、modules/utils、email/index、router imports）。
- Vitest：3 个测试文件、27 个用例全部通过。

### 失败和修复过程

根目录 eslint 为 v9 且无 flat config，需进入 `apps/abi` 使用其本地 eslint（flat config）执行。

## 回归检查

- 列表视图横向滚动（`x: 'max-content'`）保留，固定列（操作列/选择列）行为与数据集页一致。
- 卡片视图、工具栏、分页、弹层未改动。
- 内容超出容器高度时由外层 `.assistant-table-scroll` 出纵向滚动条，与数据集页表现一致。

## Review 结果

改动仅为删除 `useTableScroll` 依赖与 `scroll.y` 传参，无业务逻辑变化。

## 发现的问题

`useTableScroll` 的 offset 硬编码（200+30）与 flex 布局实际可用高度不匹配，其他使用方（manage/post、manage/role-auth、manage/group）可能存在同类问题，本轮不在需求范围内，未改动。

## 本轮经验

v5 列表页纵向滚动应统一由外层 `.assistant-table-scroll` 容器承担，不给 `ATable` 传 `scroll.y`；需要固定表头时才单独评估。

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

如管理端页面（manage/post 等）反馈同类滚动条问题，可按本方案统一移除 `scroll.y`。

## 未解决问题

无。
