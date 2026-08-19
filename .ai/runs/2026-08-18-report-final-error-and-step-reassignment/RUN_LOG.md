# 报告错误终态与执行步骤归属修复运行记录

## 结果

- 状态：已完成。
- 日期：2026-08-18。
- 影响应用：`apps/chat`。

## 问题复现

对 DB0 的 `report:0cd9968b-9667-4968-8d46-0e7948582d56:7` 进行了只读检查，共 100 条事件。关键顺序为：

1. `1787017831447-0` 的计划 version 3 没有 `in_progress` 任务。
2. `step-6` 在 `1787017874528-0` 至 `1787017902150-0` 之间生成并执行订单总额 SQL。
3. `1787017902152-0` 的计划 version 4 才把“生成订单总额查询 SQL”标记为唯一 `in_progress`。
4. `1787018142994-0` 的 `final` 返回“大模型对话生成错误”，随后才出现整体 `done`。

原 reducer 在步骤首次出现时永久锁定未归属状态，并且普通保存错误 `final`；后续 `done` 还会因为此前的 Markdown 候选把任务覆盖为完成。

## 修改内容

- 在后置计划满足严格条件时，将上一计划时间片内的未归属步骤回填到新进入执行中的唯一任务。
- 回填要求上一计划没有执行中任务、目标任务在相同位置和标题下由 `pending` 变为唯一 `in_progress`；无法唯一判断时继续保留未归属。
- 识别已确认的“大模型对话生成错误” `final`，立即进入失败终态。
- 错误终态将执行中步骤标记为失败，将尚未结束的 ToDo 收敛为取消，保留已完成任务。
- 错误 `final` 后的 `done` 只补充结束位置和耗时，不再覆盖失败状态或展示已有候选报告。
- Hook 收到错误 `final` 后主动中止当前进度连接，并阻止失败任务再次进入重连循环。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`

## 验证

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode`
  - 8 个测试文件、55 个用例全部通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `git diff --check`
  - 通过。
- 本轮未运行完整应用构建；修改集中在已由定向 Vitest 覆盖的 reducer 和连接终止分支，并已通过 `ai-bot` TypeScript 检查。

## 回归与风险

- 正常 `final`、成功 `done`、报告候选和附件聚合规则保持不变。
- 多个执行中候选或任务标题/位置发生变化时不会强制回填，仍保留未归属记录，避免误归类。
- 当前错误识别依据后端已确认的“大模型对话生成错误”前缀；若后端新增其他错误 `final` 文案，需要同步扩展明确协议。
- 未修改普通对话、报告提交、IndexedDB、历史 query、报告样式或 Redis 数据。

## AI 系统更新判断

- 当前需求和本轮运行记录已更新。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
