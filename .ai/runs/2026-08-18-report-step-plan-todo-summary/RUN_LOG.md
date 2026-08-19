# 报告 step.plan 分阶段映射与 Todo 总结 Run Log

## 基本信息

- 日期：2026-08-18
- 任务名称：report-step-plan-todo-summary
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：报告实时事件协议调整 / UI 状态修复

## 需求摘要

依据 DB0 真实 Stream `report:0cd9968b-9667-4968-8d46-0e7948582d56:11` 调整报告页面：首个 `step.plan` 固定为顶部思考总结，首段同 ID 的 `step.done` 到达后才进入 Todo；后续事件组内的 `plan.update` 已将下一项标为执行中，因此紧随其后的 `step.plan` 按 `todo_meta.done - 1` 映射为前一个已完成 Todo 的阶段总结，并展示在该 Todo 的公开执行子步骤之后。

## 影响范围

- `apps/chat/src/components/conversation/report-mode/types.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/helpers.ts`
- `apps/chat/src/components/conversation/report-mode/ReportThinkingPanel.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportTodoList.tsx`
- `apps/chat/src/components/conversation/report-mode/styles.module.css`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.ts`
- 对应 report-mode 单元测试

## 实现说明

- 增加 `thinkingCompleted`，把阶段切换从首份 `plan.update` 延后到首条 `step.plan` 对应步骤的 `step.done`。
- `thinkingPlan` 只保存第一条有效 `step.plan`，不再被后续阶段总结覆盖。
- 增加 `todoSummaries`：`done>0` 映射 `done - 1` 的前一个已完成任务；`done=0` 不归到当前执行项，无法可靠定位时跳过并留下 warning。
- 保留 `todo_meta.started` 作为阶段序号诊断信息，但不使用它改变总结归属。
- Todo 数量和名称始终只取自 `plan.update.tasks` 完整快照；`step.plan` 仅增加任务内部总结，不创建额外 Todo。
- Todo 展开内容按“执行子步骤、阶段总结”排序；`todowrite` 元数据继续由可见性规则隐藏。
- 完成历史显式设置 `thinkingCompleted=true`，保证历史报告直接进入最终展示。
- 保留既有步骤安全回填、错误 `final` 终态、附件和报告预览行为。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
- `pnpm --filter ai-bot build`
- `git diff --check`

### 测试结果

- report-mode：9 个测试文件、58 个用例全部通过。
- TypeScript：通过，无输出。
- `ai-bot` 构建：通过，6007 modules transformed。
- `git diff --check`：通过。

### 失败和修复过程

- 新增测试先暴露旧行为：首份 `plan.update` 立即进入 Todo、后续 `step.plan` 覆盖顶部思考、Todo 中没有阶段总结。
- 实现新状态后，旧的打字机 helper 测试缺少 `thinkingCompleted=true`，补齐完成态样本后通过。
- 用户纠正语义后，真实五项计划回归先暴露 `done=0` 被错误归到当前执行项、`started` 未保留；修正为 `done - 1` 映射并补齐 `started` 后，reducer 20 条测试与 report-mode 58 条测试全部通过。

## 回归检查

- `final` 错误立即失败和后续 `done` 不覆盖失败状态的测试继续通过。
- 未归属步骤安全回填、多候选不猜测、报告附件、分段 HTML payload 和历史恢复测试继续通过。
- ToDo 总面板仍只在初始化时默认收起，实时事件不修改 `todoOpen`。

## Review 结果

- 修改限制在 report-mode 状态、展示与测试，没有改普通对话、接口、IndexedDB、输入框和系统侧栏。
- Todo 总结归属只使用 `todo_meta` 和明确任务快照，不使用标题相似度或 `step` 序号猜测。
- 面向用户的 UI 没有增加 Redis、SSE、事件 ID 等技术术语。

## 发现的问题

- Vite 构建仍输出已有的 Ant Design `use client`、路由文件命名、动态/静态混合导入和大 chunk 警告；构建成功，这些警告不由本次改动引入。

## 是否需要更新 AI 系统

- `context/`：不需要，属于本次后端事件协议细节，不是仓库级长期架构变化。
- `prompts/`：不需要。
- `agents/`：不需要。
- `skills/`：不需要。
- `mcp/`：不需要。
- `checklists/`：不需要。
- `decisions/`：不需要，没有新增架构决策。

## 后续建议

- 后端再提供新真实 Stream 时，可继续使用相同 reducer 测试夹具核对 `todo_meta.done` 与任务快照的一致性。

## 未解决问题

- 当前没有报告模式 E2E/截图回归；本轮以 reducer、静态组件渲染、类型检查和生产构建完成验证。
