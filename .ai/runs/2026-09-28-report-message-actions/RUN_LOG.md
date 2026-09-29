# 报告模式问答复制与删除运行记录

## 目标

- 在报告模式问题气泡下补充复制和删除操作。
- 复制只写入当前问题文本。
- 删除复用交互模式按轮次删除接口，接口明确成功后再移除当前问题和整张报告回复。

## 实现结果

1. 报告问题操作区增加“复制”“删除”两个入口，沿用交互模式的悬浮操作样式；触屏设备保持入口可见。
2. 复制内容固定读取 `report.question`，不读取报告回复、思考过程或文件内容。
3. 删除调用既有 `deleteMessageByRound`，请求参数为当前 `convUid` 与单个报告 `sortOrder` 组成的 `roundIndex` 数组。
4. 删除前增加二次确认；业务响应失败或请求异常时保留原问答并显示错误，成功后才移除报告记录。
5. 删除成功后终止该报告仍在进行的提交/流连接、清理本地恢复任务，并在必要时关闭右侧报告预览。
6. 未修改交互模式现有编辑、复制、批量删除流程，也未修改报告发送和回复展示逻辑。

## 验证

- `pnpm exec vitest run apps/chat/src/components/conversation/report-mode/ReportMessageRow.test.tsx apps/chat/src/components/conversation/report-mode/reportMessageActions.test.ts`
  - 通过：2 个测试文件，7 条用例。
- `pnpm exec eslint src/components/conversation/report-mode/reportMessageActions.ts src/components/conversation/report-mode/reportMessageActions.test.ts`（工作目录 `apps/chat`）
  - 通过；仅输出环境中的 pyenv rehash 与 React version 配置警告。
- 修改文件 ESLint 已尝试执行，但现有老文件存在大量既有 `import/order`、`no-explicit-any`、`prefer-read-only-props` 等基线错误，无法作为本次通过门禁；本次新增文件单独检查通过。
- `pnpm exec tsc --noEmit -p tsconfig.app.json --pretty false` 已尝试执行，但被无关既有文件 `src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 的 JSX 语法错误阻断。
- `git diff --check`
  - 通过。

## 回归检查

- 删除接口与交互模式保持同一个 `/abi-chat/v1/app/message/deleteByRound` 服务方法。
- 删除失败不会关闭确认框、不会清理问题或回复、不会提示成功。
- 报告尚未取得有效持久化轮次时不会发出错误轮次删除请求。
- 复制入口不包含编辑能力，报告回复区域和普通交互模式行为未改变。

## AI 开发资产评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 本次不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
