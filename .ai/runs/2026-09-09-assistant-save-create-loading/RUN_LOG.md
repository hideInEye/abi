# 助手编辑页保存/创建按钮 loading 互串修复

## 基本信息

- 日期：2026-09-09
- 任务名称：assistant-save-create-loading
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-09 追加：助手编辑页保存/创建按钮 loading 互串修复）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression
- 任务类型：缺陷修复（按钮交互态）

## 需求摘要

助手编辑抽屉头部点「保存」或「创建」时两个按钮同时 loading；根因是两按钮共用 `loading={saving === 'draft'}` 且 `handleSave` 不区分触发按钮。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`

## 实现说明

- saving 状态联合类型新增 `'create'` 档；`handleSave` 新增第三参 `savingKey: 'draft' | 'create'`（默认 'draft'），创建按钮传 `'create'`。
- 创建按钮 `loading={saving === 'create'}`；保存按钮 loading 条件不变。
- 三按钮互斥禁用：保存 disabled 于 create/publish 进行中；创建 disabled 于 draft/publish；发布 disabled 于 draft/create。
- 提交逻辑、payload、成功文案、handlePublish 均未改动。

## 测试记录

### 执行的命令

- `pnpm --filter chatbi typecheck`

### 测试结果

退出码 2（仓库既有基线报错 404 条），涉及 `assistant-edit-drawer.tsx` 的为 0 条，对比基线无新增错误。

### 失败和修复过程

无。

## 回归检查

- 保存/创建提交路径与改前完全一致（仅 saving 标记值不同）。
- 发布按钮 loading/disabled 行为与改前一致（publish 档语义未变）。
- `if (saving) return` 防重入守卫覆盖新增的 create 档。

## Review 结果

改动局限于 saving 状态机与三个按钮的 loading/disabled 表达式，无接口与 payload 变化。

## 发现的问题

无。

## 本轮经验

复用同一提交函数的多按钮，loading 态必须按触发源分档，不能共用同一状态值。

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

无。

## 未解决问题

无。
