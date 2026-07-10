# Run Log: 修复对话 Excel 参数名

## 基本信息

- 日期：2026-07-10
- 任务名称：fix-excel-chat-param
- 需求来源：用户反馈（对话 Excel 分析请求参数应为 `excel_file_id` / `excel_file_name`）
- 执行 AI：Qoder
- 任务类型：缺陷修复

## 需求摘要

用户在 Excel 分析对话中发现，请求体 `context.extra` 中携带的字段名为 `file_id` / `file_name`，后端实际要求为 `excel_file_id` / `excel_file_name`。需要修正发送对话请求时的参数名映射。

## 影响范围

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`

## 修改文件

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`

## 实现说明

在 `getAnswer` 函数构造对话请求参数时：

- 将 `params.context.extra.file_id` 改为 `params.context.extra.excel_file_id`
- 将 `params.context.extra.file_name` 改为 `params.context.extra.excel_file_name`
- 同步调整清理多余字段时的解构字段名

内部状态（`selectedExcel.file_id/file_name`）、上传组件返回字段、导出接口等保持原字段名不变，仅修改发送给 `/chat-proxy/api/v2/workflow/chat_excel/completions` 接口的参数字段。

## 测试记录

### 执行的命令

- `cd apps/chat && npx tsc --noEmit`
- `pnpm --filter ai-bot lint`（因仓库 ESLint flat config 配置问题失败，非本次改动导致）

### 测试结果

- TypeScript 类型检查通过，无类型错误。
- `pnpm lint` 失败原因：`eslint.config.js` 中使用了 `env` 键，与 ESLint 9 flat config 不兼容，属于仓库既有配置问题。

### 失败和修复过程

无。

## 回归检查

- 确认仅修改了请求体 `context.extra` 中的字段名，未改动组件内部状态、上传/导出等其他逻辑。
- 确认无其他代码引用 `excel_file_id` / `excel_file_name`，本次为首次引入该参数名。

## 发现的问题

`apps/chat` 的 `pnpm lint` 当前不可用，需后续修复 ESLint flat config 配置。

## 是否需要更新 AI 系统

不需要。本次为单一参数名修复，未引入新的架构约定或开发流程变化。
