# 报告提交 schema_id 参数修订运行记录

## 基本信息

- 日期：2026-08-05
- 分支：`dev/zanghb-20260720-chatreport`
- 任务：报告提交移除会话 `group_id`，改传数据语义叶子节点 `schema_id`
- 状态：完成

## 协议确认

- 普通交互请求继续使用 `context.extra.semantic_id`，本次不修改。
- 报告提交 `POST /chat-proxy/api/v1/chat/report` 删除 `group_id`，新增 `schema_id: number | string`。
- `schema_id` 来源为 `ChatInput.onSelectData` 选中的 `node.schemaId`。
- 当前语义树只有 `type='schema'` 叶子可选；分组节点不能触发 `onSelectData`。
- `schemaId` 保持节点原始 `number | string` 类型，不转换为会话分组或语义分组 ID。

## 修改内容

1. 更新 `SubmitReportRequest`，使用 `schema_id` 替代 `group_id`。
2. `Conversation` 将现有 `semanticId` 传入报告 Hook 的 `schemaId`。
3. 报告 Hook 构造请求时直接透传 `schemaId`。
4. 删除仅供旧报告 `group_id` 使用的 `sessionGroupId` 属性和父级透传。
5. 更新报告 API 测试样本，固定新的请求字段。

## 影响文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/service/api/report.ts`
- `apps/chat/src/service/api/report.test.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
- `apps/chat/src/components/conversation-analysis/index.tsx`

## 验证结果

- `pnpm exec vitest run src/service/api/report.test.ts src/components/conversation/components/chat-input/sendValidation.test.ts src/components/conversation/report-mode`：通过，9 个测试文件、51 个用例。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过。
- `git diff --check`：通过。

构建仍只有项目既有的 Ant Design `use client`、动态/静态导入和大 chunk 警告。

## 回归检查

- 会话分组路由、分组列表、创建会话时的 `groupId` 保持不变。
- 普通交互发送、数据语义选择组件及 `onSelectData` 行为保持不变。
- 报告历史恢复、任务状态和 Java SSE 逻辑保持不变。
- 仅上传 Excel 时继续保持既有发送条件，报告请求的 `schema_id` 为空字符串；本次未新增报告模式专属限制。

## AI 开发系统更新评估

- `.ai/requirements/`：已更新当前报告提交协议。
- `.ai/runs/`：已新增本次运行记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：无需更新，本次是局部接口字段修订。
