# Chat 报告 SSE MCP 分组映射与空间重载 Run Log

## 基本信息

- 日期：2026-09-15
- 任务：chat-report-sse-mcp-group-map
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“Chat 报告对话 SSE MCP 版本分组映射”
- 影响应用：`apps/chat`

## 最终行为

1. 报告提交的 `sse_mcp_source_version_ids` 从 SSE MCP ID 数组改为单键对象数组，例如 `[{ "41": 1001 }]`；键为当前 MCP `id`，值为所选分组 `groupId`。
2. 全局 MCP 从页面分组上下文取 `groupId`；助手绑定 MCP 保留详情 `mcp_sse` 数组中的真实分组 ID。
3. 同一 `MCP ID + 分组 ID` 组合去重；同一 MCP 有多个 SSE 分组时生成多个单键对象。
4. 主对话报告模式与分享悬浮窗报告模式共用 `buildReportSourceVersionFields`，避免两处协议再次分叉。
5. `mcp_streamable_source_version_ids`、技能、内置工具和探索/交互模式参数保持原格式。
6. Chat 空间切换时清空旧 MCP 分组、服务缓存和已选项；旧空间已加载过 MCP 时，使用新 `spaceId` 立即重拉。
7. MCP 分组和组内服务请求使用 generation 门禁；旧空间迟到响应、业务失败或 reject 都不写入当前列表。

## 修改文件

- `apps/chat/src/service/api/report.ts`
- `apps/chat/src/service/api/report.test.ts`
- `apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.ts`
- `apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.test.ts`
- `apps/chat/src/components/conversation/components/chat-input/mcpSpaceLoad.ts`
- `apps/chat/src/components/conversation/components/chat-input/mcpSpaceLoad.test.ts`
- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
- `apps/chat/src/pages/chat/workshop/assistantResources.ts`
- `apps/chat/src/pages/chat/workshop/assistantResources.test.ts`
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`
- `apps/chat/src/components/chat-widget/service.ts`
- `apps/chat/src/components/chat-widget/service.test.ts`

## 定向测试

```text
pnpm exec vitest run \
  apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.test.ts \
  apps/chat/src/components/conversation/components/chat-input/mcpSpaceLoad.test.ts \
  apps/chat/src/service/api/report.test.ts \
  apps/chat/src/pages/chat/workshop/assistantResources.test.ts \
  apps/chat/src/components/chat-widget/service.test.ts
```

结果：5 个测试文件、41 个用例全部通过。覆盖空选择、SSE 单/多分组、去重、缺失分组、streamable 不变、请求体 JSON 序列化、新空间参数、业务失败/reject 阻断和迟到响应丢弃。

## 其他检查

- `pnpm --filter ai-bot exec tsc --noEmit --skipLibCheck`：通过。
- `git diff --check`：通过。
- 定向 ESLint 未执行到文件规则：Chat 现有 flat config 引入的配置含 ESLint 9 不支持的 `env` 字段，命令在解析配置阶段退出；本轮未修改无关 Lint 配置。
- 新增纯工具和映射文件已使用项目 Prettier 格式化；未对大型既有组件做全文格式化。

## 回归边界

- 自动化已验证参数映射和空间请求编排。
- 当前环境未进行登录后真实报告接口发送和空间切换界面操作；联调时需在 Network 中确认最终 JSON 与新空间 MCP 请求。

## AI 系统更新判断

- `.ai/requirements/`：已更新本轮目标、非目标、验收和测试要求。
- `.ai/runs/`：已新增本 Run Log。
- `.ai/context/`、`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：不需要更新，本轮没有改变架构、长期开发规则或外部工具协议。
