# 报告 `step.plan` 思考内容接入运行记录

## 基本信息

- 日期：2026-08-17
- 状态：完成
- 需求：Todo 返回前使用 `step.plan.content` 展示报告思考正文

## 实现内容

- 新增 `step.plan` Stream 事件类型和公开规划正文状态。
- reducer 识别直接事件以及调试数据中的 `{ data: event }` 包裹格式。
- 多条 `step.plan` 按 Redis entry 顺序使用最后一条有效内容。
- 空白或无效 `content` 不覆盖既有正文，并写入 warning。
- 思考区仅展示 `step.plan.content`；事件到达前展示分析占位，不再回退展示旧 `step.start/meta/chunk` 思考步骤。
- 第一条 `plan.update` 仍切换到 Todo 阶段并收起思考区。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation/report-mode/types.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.ts`
- `apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts`
- `apps/chat/src/components/conversation/report-mode/ReportThinkingPanel.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportThinkingPanel.test.tsx`
- `apps/chat/src/components/conversation/report-mode/styles.module.css`

## 验证结果

- `pnpm --filter ai-bot exec vitest run src/components/conversation/report-mode/reportStreamReducer.test.ts`
  - 1 个测试文件、15 个测试通过。
- `pnpm --filter ai-bot exec vitest run src/components/conversation/report-mode`
  - 8 个测试文件、52 个测试通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
  - 通过。
- `pnpm --filter ai-bot build`
  - 通过。
- `git diff --check`
  - 通过。

## 回归与已知说明

- 未修改 Todo 任务聚合、报告文件、普通对话和报告提交参数。
- 构建仍有项目已有的路由文件扫描、第三方依赖 `use client`、动态导入和大 chunk 警告，本次未新增相关问题。
- 当前工作区还包含前一轮报告源版本字段接入改动，本轮没有恢复或覆盖它们。

## AI 开发系统更新判断

- `.ai/requirements/`：已更新当前需求。
- `.ai/runs/`：已新增本次运行记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：本次无需更新。
