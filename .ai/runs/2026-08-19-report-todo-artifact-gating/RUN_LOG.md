# 报告 Todo 产物门控 Run Log

## 基本信息

- 日期：2026-08-19
- 任务：report-todo-artifact-gating
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 影响范围：`apps/chat` 报告历史适配、实时事件聚合和失败结果展示

## 需求摘要

报告可能以 HTML 或 Markdown 正文返回，也可能附带 PDF/Word 下载地址；但这些产物只有在属于“生成报告”Todo、该 Todo 最终完成且整体流程结束后，才能展示为最终报告。技能加载等其他步骤返回的 Markdown 只是过程输出，不能作为最后一条内容兜底生成报告卡。

## 实现说明

- 新增报告 Todo 识别函数，匹配计划名称中的“报告”或 `report`；该判断只服务产物归属，不参与步骤或 Todo 状态计算。
- 实时 `step.chunk` 仍完整保存在公开执行步骤中，但只有 execution group 已归属报告 Todo 时，HTML/Markdown 才进入报告候选，PDF/Word 才进入报告附件。
- 实时收到整体 `done` 后，同时检查报告 Todo 已完成且至少存在一个报告候选或附件；条件不足则失败并清空误识别的产物。
- 历史适配使用同一 Todo 归属规则，只从已完成报告 Todo 的步骤中恢复 HTML/Markdown/PDF/Word。
- 历史 `final_content` 为“大模型对话生成错误”时优先恢复为失败终态，不会被此前的技能 Markdown 覆盖成成功报告。
- 无报告失败时仍显示真实 `final_content`，但不渲染报告文件卡和右侧预览入口。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/helpers.ts`
- `apps/chat/src/components/conversation/report-mode/helpers.test.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.test.ts`
- `apps/chat/src/components/conversation/report-mode/ReportMessageRow.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportMessageRow.test.tsx`

## 验证记录

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`：10 个测试文件、64/64 通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过，6007 modules transformed。
- 定向 `git diff --check`：通过。

回归用例覆盖：

- 技能 Todo 的 Markdown + 报告 Todo 取消 + `done`：失败且无报告候选。
- 已完成报告 Todo 的 HTML + `done`：完成并可预览。
- 已完成报告 Todo 的 Markdown + `done`：完成并可预览。
- 已完成报告 Todo 的 PDF 附件 + `done`：完成并可下载。
- 历史失败 payload 中技能 Markdown、空 PDF/Word 和错误 `final_content`：保留错误说明，不显示报告文件卡。

## 回归与风险

- 报告 Todo 当前依据计划名称中的“报告”或 `report` 识别；若后端未来使用不含上述词语的名称，需要补充稳定的任务类型字段或同步扩展识别协议。
- 构建仍有既有路由文件、Ant Design `use client`、动态/静态混合导入和大 chunk 警告；构建成功，这些警告不是本次引入。
- 普通对话、报告提交参数、IndexedDB、Todo/Plan 归属、报告样式和下载实现未在本轮修改。

## AI 系统更新判断

- `.ai/context/`、`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：无需更新。本次是当前报告事件协议下的产物门控修正，已记录在当前需求与本运行日志中。
