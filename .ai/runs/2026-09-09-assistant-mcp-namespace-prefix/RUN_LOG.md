# 助手绑定 MCP 协议分组保存值改为 namespaceId（s_ 前缀）

## 基本信息

- 日期：2026-09-09
- 任务名称：assistant-mcp-namespace-prefix
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-09 追加：助手绑定 MCP 协议分组保存值改为 namespaceId（s_ 前缀））
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test、Regression
- 任务类型：缺陷修复（保存参数口径）

## 需求摘要

助手扩展能力保存 MCP 工具时，toolConfig 的 `mcp_sse/mcp_streamable` 原先存分组列表的原始 groupId（无前缀），与 `/api/abi-mcp/v1/mcp/register/list` 查询入参 `namespaceId`（`s_${groupId}`）口径不一致；改为保存带 `s_` 前缀的 namespaceId。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`（保存写入点）
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/tool-picker-drawer.tsx`（仅注释）

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/tool-picker-drawer.tsx`

## 实现说明

- `mergeOptionNames` 中 MCP 工具按协议归类时，先拼 `const namespaceId = \`s_${o.groupId}\``（与 register/list 查询入参同口径），再写入 `mcpSse/mcpStreamable`，替代原先的原始 `o.groupId`。
- 回显链路（loadDetail 读 `mcp_sse/mcp_streamable` → buildPayload 写回）保持原样透传，不做迁移；chat 端仅按非空判协议，不受影响。
- tool-picker-drawer 仅更新注释，说明 groupId 为无前缀原始值、保存侧加 `s_` 前缀。

## 测试记录

### 执行的命令

- `pnpm --filter chatbi typecheck`

### 测试结果

`pnpm --filter chatbi typecheck` 退出码 2（仓库既有基线报错 404 条），其中涉及 `assistant-edit-drawer.tsx` / `tool-picker-drawer.tsx` 的为 0 条，对比基线无新增错误。

### 失败和修复过程

无。

## 回归检查

- 保存 payload 其余字段（groupPath、sort、id、name）不变。
- 存量助手详情回显 → 再保存：mcp_sse/mcp_streamable 原样透传，行为与改前一致。
- chat 端 `service.ts` / `assistantResources.ts` 仅用 `mcp_sse.length > 0` 判协议，前缀不影响。

## Review 结果

改动收敛在唯一写入点 `mergeOptionNames`；无新增接口调用、无无关模块牵连。

## 发现的问题

无。

## 本轮经验

MCP 相关 ID 口径：分组列表 groupId 为无前缀长号，凡作为 namespaceId 使用（register/list、register、detail、删除、助手绑定保存）均需 `s_` 前缀。

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

如后端要求存量数据统一口径，需另行安排数据迁移（本轮非目标）。

## 未解决问题

无。
