# 报告模式 ToDo 默认收起运行记录

## 基本信息

- 日期：2026-08-11
- 应用：`apps/chat`
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“2026-08-11 追加：报告模式 ToDo 默认收起”
- 状态：已完成并通过验证

## 完成内容

1. 实时报告收到 `plan.update` 后继续自动收起思考区，但 ToDo 总面板保持默认收起。
2. 从历史 query 恢复的已完成报告，其 ToDo 总面板同样默认收起。
3. 保留用户手动展开/收起 ToDo 的交互，以及现有任务状态、步骤归属和单任务展开逻辑。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.test.ts`
- `.ai/runs/2026-08-11-report-todo-default-collapsed/RUN_LOG.md`

## 验证结果

- `pnpm --filter ai-bot exec vitest run src/components/conversation/report-mode`：7 个文件、50 个测试全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过。
- `git diff --check`：通过。

## 构建提示

- 仍存在项目既有的非 Route 文件提示、第三方 `use client`、混合动态/静态导入和大 chunk 警告；本轮未新增构建错误。

## 回归检查

- 用户仍可手动展开和收起 ToDo 总面板。
- 当前执行任务的步骤展开规则未修改。
- 普通交互模式、报告提交、事件解析、报告预览和下载逻辑未修改。

## AI 开发系统更新判断

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
- 原因：本轮仅调整报告模式局部默认展开状态，没有形成新的跨项目架构规则。

## 未解决问题

- 无本任务阻断项。
