# 2026-08-04 ChatInput 校验失败保留问题运行记录

## 问题

`ChatInput.handleSend` 原先先调用父级 `onSend`，随后立即执行 `setValue('')`。即使父级因未选择数据而拦截发送，输入框中的问题仍会被清空。

## 修改

- 将共用数据选择判断移动到 `conversation/components/chat-input/sendValidation.ts`，与输入组件就近维护。
- `ChatInput.handleSend` 调整为：检查问题和 loading → 检查数据选择 → 调用 `onSend` → 清空输入框。
- 校验失败时显示原提示并直接返回，不调用 `onSend`、不清空问题。
- `ConversationAnalysis.handleUnifiedSend` 继续复用同一校验，作为非 ChatInput 调用路径的防御性兜底。
- 更新当前需求文档，明确点击发送和 Enter 发送均需保留失败问题。

## 验证

- 定向 Vitest：3 个测试文件、24 个测试通过；数据选择判断覆盖无数据、数据语义和 Excel。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过；仅有仓库现存 Ant Design、混合导入和大 chunk 警告。
- `git diff --check`：通过。

## 回归结论

- 未选择数据时，点击发送或按 Enter 都不会调用父级发送，也不会清空问题。
- 选择数据语义或 Excel 后，继续调用原 `onSend`，并在提交给父级后清空输入框。
- 未修改普通对话接口、报告接口、数据选择和文件上传流程。

## AI 开发系统更新评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
