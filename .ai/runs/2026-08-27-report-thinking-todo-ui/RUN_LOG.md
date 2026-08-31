# Report Thinking / Todo UI Run Log

## 任务

- 报告思考区收起时保留两行正文与渐变遮罩。
- 修正 Todo 等待态灰色，并统一完成、失败、执行中、等待中的无边框圆角色块。
- Todo 总面板收起时展示当前公开步骤与 Skill 摘要，展开后隐藏。

## 修改范围

- `apps/chat/src/components/conversation/report-mode/ReportThinkingPanel.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportTodoList.tsx`
- `apps/chat/src/components/conversation/report-mode/helpers.ts`
- `apps/chat/src/components/conversation/report-mode/styles.module.css`
- 对应 `ReportThinkingPanel.test.tsx`、`ReportTodoList.test.tsx`、`helpers.test.ts`

普通交互模式 `AiEle` 仅作为折叠行为参考，未修改其代码或样式。

## 实现说明

- 思考正文与占位内容始终保留在 DOM 中；收起时由固定两行视窗裁切，底部渐变提示仍有隐藏内容。
- Todo 状态标签不再使用 Ant Design `Tag`，改为报告模块局部状态色块；等待态图标和文案使用中性灰。
- 折叠摘要只从当前 `in_progress` 任务和 `ReportPublicStep` 的 `action/title/actionIntention/chunks` 等公开字段提取。没有可靠 Skill 名称时只展示当前步骤，不补造技能。
- 动态状态点在 `prefers-reduced-motion` 下停止动画。

## 验证

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 10 个测试文件、76 个用例全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `pnpm --filter ai-bot build`
  - 通过；保留现有路由导出、Ant Design `use client`、动态/静态导入与大包体积警告，本次未引入新的构建错误。
- `git diff --check`
  - 通过。

## 风险与回归

- Skill 名称只识别公开文本中的明确标记（如 `Skill: sql-generator`、`调用 sql-generator 技能`）；无法可靠识别时按需求降级，不显示虚假 Skill。
- 未修改 Stream reducer、历史适配、普通对话、报告文件与预览逻辑。

## AI 系统更新判断

本次是报告模块局部交互修正，无需更新 `.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/context`、`.ai/checklists` 或 `.ai/decisions`。
