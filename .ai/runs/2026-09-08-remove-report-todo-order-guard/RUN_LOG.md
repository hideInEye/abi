# Remove Report Todo Order Guard Run Log

## 任务

- 撤销报告模式对 `plan.update.tasks` 的任务状态顺序过滤。
- 恢复按后端返回的完整任务快照进入现有聚合和渲染流程。

## 修改范围

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- 删除 `.ai/runs/2026-09-04-report-todo-order-guard/RUN_LOG.md`

## 实现说明

- 删除 `hasValidPlanTaskOrder` 校验及 `plan.update` 中的静默丢弃分支。
- 删除该兜底对应的两条专用测试。
- 未修改 Todo 的现有聚合、排序、状态、步骤归属和展示逻辑。

## 验证

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 10 个测试文件、84 个用例全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `git diff --check`
  - 通过。

## 回归检查

- `plan.update.tasks` 不再因完成状态的位置被丢弃。
- 普通报告计划、步骤归属、报告内容和普通对话逻辑未调整。
- 工作区已有的指标建模文件修改未被恢复或覆盖。

## AI 系统更新判断

本次为局部逻辑回退，不需要更新 `.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/context`、`.ai/checklists` 或 `.ai/decisions`。
