# 报告提交源版本字段接入运行记录

## 基本信息

- 日期：2026-08-17
- 状态：完成
- 需求：报告提交时携带技能和 MCP 的四类源版本 ID

## 实现范围

- 报告请求新增并始终提交：
  - `sse_mcp_source_version_ids`
  - `mcp_streamable_source_version_ids`
  - `skills_source_version_ids`
  - `builtin_tools_source_version_ids`
- 技能取 `latestVersionId`，按 `skillType=0/1` 分别进入内置工具和外部技能字段。
- MCP 取当前 `register/list` 选择项的 `id`，按 `protocol` 分流，并兼容已有响应字段 `frontProtocol`。
- 任一类别没有有效选择时发送空字符串；有选择时发送去重后的 ID 数组。
- 参数只进入报告提交链路，普通交互请求不变。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/service/api/report.ts`
- `apps/chat/src/service/api/report.test.ts`
- `apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.ts`
- `apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.test.ts`
- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`

## 验证结果

- `pnpm --filter ai-bot exec vitest run src/components/conversation/components/chat-input/reportSourceSelection.test.ts src/service/api/report.test.ts`
  - 2 个测试文件、10 个测试通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `pnpm --filter ai-bot build`
  - 通过。
- `git diff --check`
  - 通过。

## 回归检查

- 普通交互模式仍只传原有发送元数据，不携带报告专用源版本字段。
- 未选择任何技能或 MCP 时，报告请求的四个字段均为 `""`。
- 混合选择、重复 ID、协议大小写和 `frontProtocol` 兼容均有纯函数测试覆盖。
- 未修改技能/MCP 选择器样式、普通对话请求、报告事件处理、IndexedDB、预览或 ToDo 逻辑。

## 已知说明

- 当前 chat 端 MCP 数据来自 `/api/abi-mcp/v1/register/list`，选择项的 `id` 按现有契约作为 MCP 源版本 ID；协议优先读取新约定的 `protocol`，兼容现有列表使用的 `frontProtocol`。
- 构建仍输出项目已有的路由文件扫描、第三方依赖 `use client`、动态导入和大 chunk 警告，本次未新增相关问题。

## AI 开发系统更新判断

- `.ai/requirements/`：已更新当前需求。
- `.ai/runs/`：已新增本次运行记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：本次无需更新。
