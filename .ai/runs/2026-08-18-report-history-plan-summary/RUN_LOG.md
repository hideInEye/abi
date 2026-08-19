# 报告历史 Plan 总结映射 Run Log

## 基本信息

- 日期：2026-08-18
- 任务：report-history-plan-summary
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 影响范围：`apps/chat` 报告历史 `react-agent` 适配层

## 需求摘要

历史 query 的阶段总结位于 `steps[].outputs[]` 的 `output_type = "plan"` 中。按 steps/outputs 原始顺序，第一条 Plan 恢复为顶部思考总结；后续 Plan 总结紧邻它之前的公开执行步骤，并继承该步骤已经确定的 Todo 归属。例如 `step-5` 的 Plan 属于 `step-4`。Plan 不能增加 Todo 数量，也不能作为普通执行输出重复展示。

## 实现说明

- 历史适配器独立提取 Plan 输出，保留原始数组顺序。
- 第一条有效 Plan 写入 `thinkingPlan`。
- 后续 Plan 写入 `todoSummaries`，使用紧邻前一个公开执行步骤的 `stepId/taskIndex/taskContent`。
- Plan 所在 marker 的 `todo_meta.done/started` 只用于更新下一阶段边界，不参与 Plan 归属计算。
- 前面没有可靠的 Todo 执行步骤时跳过，不做标题、步骤数字或 Plan 文案猜测。
- `toPublicChunks` 排除 Plan，HTML/Markdown 候选及 PDF/Word 附件逻辑保持不变。
- Todo 数量和状态仍完全取自 `task_plan`。
- 历史 `final_content` 作为公开最终总结映射到 `final.content`，复用既有最终总结区域；空白或非字符串内容不展示。
- `thought/action_input` 继续不进入公开视图模型。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.test.ts`

## 验证记录

- 第一轮回归先失败：`thinkingPlan` 为 `undefined`，证明原历史适配器忽略了 Plan 输出。
- 用户纠正相邻语义后，回归再次先失败：`step-5` Plan 被错误记录为 `step-5` 并按 `done - 1` 归入第 3 个 Todo。修复后该总结记录为 `step-4`，并继承 `step-4` 所属的第 2 个 Todo。
- `final_content` 回归先失败：历史报告的 `final` 为 `undefined`；适配后以稳定的 `history:{roundIndex}:final` 标识恢复并通过测试。
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.test.ts`：7/7 通过。
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`：9 个测试文件、60/60 通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过，6007 modules transformed。
- `git diff --check`：通过。

## 回归与风险

- 实时 Stream 的 `step.plan` reducer 未修改。
- 普通对话、报告提交、IndexedDB、任务恢复、报告预览和下载未修改。
- 构建仍存在既有的路由文件、Ant Design `use client`、动态/静态混合导入及大 chunk 警告；均未阻断构建，且不是本次引入。

## AI 系统更新判断

- `context/`、`prompts/`、`agents/`、`skills/`、`mcp/`、`checklists/`、`decisions/`：无需更新。本次属于已记录在当前需求中的后端历史协议适配细节。
