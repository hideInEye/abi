# 2026-09-07 大屏数据库 SQL 的 select 前缀校验大小写修复

## 基本信息

- 日期：2026-09-07
- 任务名称：dashboard-sql-select-case
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-07 追加：大屏数据库 SQL 的 select 前缀校验大小写修复）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：Bug 修复

## 需求摘要

反馈缺陷：大屏设计器「数据」面板（数据库数据源）中，以大写 `SELECT` 开头的 SQL 点击「测试SQL并保存」误报「SQL语句必须以select开头」。排查结论：前端自有校验缺陷，非 code-editor 组件或后端限制。

## 影响范围

- `apps/dashboard/src/comps/common-component/data-config/database/DatabaseConfig.tsx`

## 修改文件

- `apps/dashboard/src/comps/common-component/data-config/database/DatabaseConfig.tsx`

## 实现说明

- 根因：`validate()` 中 `sql.trim().startsWith('select')` 大小写敏感，大写 `SELECT` 被误判。
- 修复：改为 `sql.trim().toLowerCase().startsWith('select')`，校验文案与其余逻辑不变。
- 顺带删除同文件未使用导入 `IDataSource`、`Base64Util`（既有 tsc TS6133 报错源），零行为变化。

## 测试记录

### 执行的命令

- `npx tsc --noEmit`（apps/dashboard，按文件名过滤输出）
- GetProblems（修改文件）

### 测试结果

- 修复前：`DatabaseConfig.tsx(21,1)/(22,1)` 两条 TS6133 既有报错；修复后该文件无 tsc 报错。
- GetProblems 修复前报两条未使用导入警告，修复后无问题。

### 失败和修复过程

无。

## 回归检查

- 非 select 开头（不分大小写）的 SQL 仍按原文案「SQL语句必须以select开头」拦截。
- 「请选择数据库」「请输入SQL语句」校验与测试保存请求逻辑未改动。
- 全仓 grep 确认该校验仅此一处，无其他同源限制。

## Review 结果

单文件两处最小改动：一行校验加 `toLowerCase()`、删除两个死导入；无跨模块影响。

## 发现的问题

无新增。

## 本轮经验

前端 SQL 前缀类校验统一应先归一化大小写再比较，避免与 SQL 关键字大小写习惯冲突。

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

待手工验证：大屏设计器中大写 SELECT 通过校验并正常测试保存。
