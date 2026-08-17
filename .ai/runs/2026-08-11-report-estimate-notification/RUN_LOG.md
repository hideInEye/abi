# 报告预计耗时提示与完成通知运行记录

## 基本信息

- 日期：2026-08-11
- 应用：`apps/chat`
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“2026-08-11 追加：报告生成预计耗时提示与完成通知”
- 状态：已完成并通过验证

## 完成内容

1. 报告处于提交、等待、思考或执行状态时，在回答卡底部展示固定 5-10 分钟预计耗时提示。
2. 提示中的“5-10 分钟左右”和“研究任务会持续进行”使用加粗强调；成功、失败或停止后提示自动消失。
3. 使用 Ant Design `notification.useNotification()` 展示报告完成通知，持续 3 秒。
4. 通知只在实时报告首次成功收到整体 `done` 时触发；历史 query、失败任务和重复事件不会重复通知。
5. 完成回调从报告 Hook 上抛到会话容器，事件聚合层不直接依赖 UI 通知组件。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportMessageRow.tsx`
- `apps/chat/src/components/conversation/report-mode/helpers.ts`
- `apps/chat/src/components/conversation/report-mode/helpers.test.ts`
- `apps/chat/src/components/conversation/report-mode/reportRecovery.ts`
- `apps/chat/src/components/conversation/report-mode/reportRecovery.test.ts`
- `apps/chat/src/components/conversation/report-mode/styles.module.css`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`
- `.ai/runs/2026-08-11-report-estimate-notification/RUN_LOG.md`

## 验证结果

- `pnpm --filter ai-bot exec vitest run src/components/conversation/report-mode`：7 个文件、50 个测试全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过。
- `git diff --check`：通过。

## 构建提示

- 仍存在项目既有的非 Route 文件提示、第三方 `use client`、混合动态/静态导入和大 chunk 警告；本轮未新增构建错误。

## 回归检查

- 普通交互模式未修改。
- 报告历史加载不会弹完成通知。
- 失败、停止或取消任务不弹成功通知。
- 报告事件解析、预览、下载、ToDo 和 IndexedDB 行为未修改。

## AI 开发系统更新判断

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
- 原因：本轮是报告模式局部交互增强，没有形成新的跨项目架构规则。

## 未解决问题

- 无本任务阻断项。
