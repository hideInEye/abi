# Report Todo Order Guard Run Log

## 任务

- 报告模式收到顺序异常的 Todo 快照时静默忽略，避免已完成任务显示在执行中或等待中任务之后。
- 不对后端任务排序，不向用户展示技术提示或错误信息。

## 修改范围

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`

## 实现说明

- 在 `plan.update` 聚合入口校验任务状态顺序：`completed` 必须构成连续前缀，首个非完成状态之后不能再次出现完成状态。
- 异常快照不覆盖上一份有效的 `currentPlan/tasks`；没有有效计划时保持空 Todo。
- 被忽略的 Redis entry 仍推进 `lastEntryId` 并写入去重记录，后续有效快照可以继续更新。
- 异常快照不写入 `warnings`，页面不产生提示。

## 验证

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
  - 1 个测试文件、23 个用例全部通过。
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 10 个测试文件、86 个用例全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `pnpm --filter ai-bot build`
  - 通过；保留项目既有的路由文件导出、Ant Design `use client`、动态/静态导入和大 chunk 警告。
- `git diff --check`
  - 通过。

## 回归检查

- 顺序正常的 `completed → in_progress → pending` 计划继续更新。
- 中间异常快照不改变已展示 Todo，后续恢复正常的计划可以继续更新。
- 未修改普通对话、报告 UI、步骤展示与归属、报告文件识别、下载和历史 query 适配。

## AI 系统更新判断

本次为报告 Stream reducer 的局部防御修复，不需要更新 `.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/context`、`.ai/checklists` 或 `.ai/decisions`。
