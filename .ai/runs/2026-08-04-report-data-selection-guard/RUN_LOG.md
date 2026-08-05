# 2026-08-04 报告模式数据选择校验运行记录

## 目标

- 报告模式与交互模式保持一致：选择数据语义或上传 Excel 后才能发送消息。
- 未选择数据时，在创建会话和调用报告提交接口之前拦截。
- 保持现有提示文案、数据选择组件和报告协议不变。

## 修改

- 更新 `.ai/requirements/CURRENT_REQUIREMENT.md`，补充发送前置条件、验收与测试要求。
- 新增 `conversation-analysis/sendValidation.ts`，集中判断数据语义 `schemaId` 或 Excel `file_id`。
- `ConversationAnalysis.handleUnifiedSend` 删除报告模式的校验例外，所有模式复用同一判断。
- 新增 `sendValidation.test.ts`，覆盖无数据、仅数据语义和仅 Excel。

## 验证

- 定向 Vitest：4 个测试文件、26 个测试通过，其中新增校验 3 个测试通过。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过；仅保留现有 Ant Design `use client`、静态/动态混合导入和大 chunk 警告。
- `git diff --check`：通过。
- ESLint 未重复执行；上一轮已确认仓库现有 ESLint 9 flat config 因使用 `env` 字段而无法进入源码检查，本轮未修改该配置。

## 回归结论

- 未选择任何数据时，发送流程在创建会话、添加报告占位和发起网络请求之前返回。
- 选择数据语义或上传 Excel 任意一种后，交互和报告模式继续沿用各自原发送链路。
- 本轮未修改报告接口参数、Redis 事件处理、IndexedDB、报告 UI 或普通消息渲染。

## AI 开发系统更新评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
