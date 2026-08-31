# Report Thinking Typewriter Run Log

## 任务

- 对当前页面新提交报告首次返回的 `step.plan` 思考正文增加一次性打字机效果。
- 思考默认展开；后端思考步骤和打字机都完成后，收起思考并自动展开 Todo。
- 历史 query、IndexedDB 恢复和页面回放直接展示完整正文，不重复播放动画。

## 修改范围

- `apps/chat/src/components/conversation/report-mode/ReportThinkingPanel.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportMessageRow.tsx`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`
- `apps/chat/src/components/conversation/report-mode/helpers.ts`
- `apps/chat/src/components/conversation/report-mode/types.ts`
- `apps/chat/src/components/conversation/components/MessageList.tsx`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/report-mode/styles.module.css`
- 对应报告模式测试与 `.ai/requirements/CURRENT_REQUIREMENT.md`

## 实现说明

- 只有当前页面提交成功创建的报告任务携带 `animateThinkingPlan=true` 和动画阶段门控；恢复与历史对象不携带该标识。
- 后端一次性返回完整正文后，前端以 30ms 间隔分批显示，最长约 180 次更新；动画结束后内容与原文完全一致。
- `step.done` 负责记录后端思考完成，打字机回调负责记录动画完成；两者都完成后原子设置 `thinkingOpen=false`、`todoOpen=true`。
- `prefers-reduced-motion` 环境直接展示全文并完成阶段切换；组件卸载时清理定时器。

## 验证

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 10 个测试文件、79 个用例全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `pnpm --filter ai-bot build`
  - 通过；仅保留项目既有的路由文件、Ant Design `use client`、动态/静态导入与大包体积警告。
- `git diff --check`
  - 通过。

## 风险与回归

- 本次不修改 `step.plan` 协议、Todo 总结归属、报告产物判断、历史适配或普通交互模式。
- 如果用户在动画期间离开当前会话，重新进入后走恢复链路并直接展示完整正文，不再等待动画。

## AI 系统更新判断

本次是报告模式局部展示行为调整，无需更新 `.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/context`、`.ai/checklists` 或 `.ai/decisions`。
