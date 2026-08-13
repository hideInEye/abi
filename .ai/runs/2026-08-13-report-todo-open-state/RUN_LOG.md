# 报告模式 ToDo 展开状态保持修复运行记录

## 基本信息

- 日期：2026-08-13
- 应用：`apps/chat`
- 范围：报告 Stream reducer 中的 ToDo 总面板 UI 状态
- 需求状态：已完成

## 问题原因

- 新建报告和历史报告的 `todoOpen` 初始值均为 `false`，符合页面加载时默认收起的要求。
- 但每条 `plan.update` 到达时，reducer 再次执行 `todoOpen: false`，导致用户已经展开 ToDo 后被接口更新强制收起。

## 修改内容

- 删除 `plan.update` 对 `todoOpen` 的强制赋值。
- `todoOpen` 继续由初始状态、历史恢复状态以及用户点击控制。
- 保留首条计划到达时自动收起思考区的既有行为。
- 增加回归测试：首个计划保持默认收起，用户展开后第二个计划更新仍保持展开。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- `.ai/runs/2026-08-13-report-todo-open-state/RUN_LOG.md`

## 验证结果

- 修复前定向测试按预期失败：第二条 `plan.update` 将 `todoOpen=true` 错误覆盖为 `false`。
- 修复后定向 reducer 测试：14 个测试全部通过。
- 完整 report-mode Vitest：7 个测试文件、50 个测试全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：构建成功。
- `git diff --check`：通过。

## 保持不变

- 页面初次加载、新建任务和历史报告恢复时仍默认收起 ToDo。
- 未修改任务状态、计划快照、执行步骤归属、任务详情展开、接口、样式和普通对话。

## 既有构建警告

- TanStack Router 继续提示 `SkillDetailDrawer.tsx` 未导出 Route。
- Vite/Rollup 继续提示依赖中的 `use client` 指令被忽略。
- 构建继续提示部分动态导入无法拆包以及主 chunk 超过 500 kB。
- 上述均为既有项目警告，本轮未修改相关模块。

## AI 开发系统更新判断

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
- 本轮是局部 UI 状态生命周期缺陷修复，不形成新的全仓架构或流程规则。
