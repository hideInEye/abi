# 报告完成耗时字段修复运行记录

## 任务

- 实时报告读取最后一条整体 `done.time`。
- 历史报告读取 `react-agent.total_time`。
- 两种来源统一在报告回答标题右侧显示“耗时 X 分 X 秒”。

## 根因

实时 `done.time`、`durationSeconds` 和标题格式化能力已经存在，但历史适配仍读取 `payload.time`。后端历史协议实际返回 `total_time`，因此重新进入会话后 `durationSeconds` 为空，标题不显示耗时。

## 修改

- `types.ts`：将历史 payload 耗时字段定义为 `total_time?: number`。
- `reportHistoryAdapter.ts`：将合法的 `total_time` 归一化到 `durationSeconds`。
- `reportHistoryAdapter.test.ts`：按真实历史字段增加恢复断言。
- `ReportMessageRow.test.tsx`：覆盖标题显示“耗时2分5秒”。
- `CURRENT_REQUIREMENT.md`：补充实时与历史耗时字段约定、非目标和验收标准。

## 验证

- 修复前定向测试：历史 `total_time: 125` 得到 `durationSeconds: undefined`，按预期失败。
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 10 个测试文件、68 个测试全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `pnpm --filter ai-bot build`
  - 通过；保留项目已有的路由文件、Ant Design `use client` 与大 chunk 警告。
- `git diff --check`
  - 通过。

## 回归结论

- 实时整体 `done.time` 仍按 Redis/SSE 事件进入 `durationSeconds`。
- 历史 `total_time` 现在与实时使用同一 UI 字段和格式化函数。
- 不影响普通对话、步骤级 `step.done`、Todo、报告文件和预览逻辑。

## 知识更新判断

本次是报告历史协议字段修复，已记录在当前需求和运行记录中；无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
