# 修复：历史对话消息顶部"分组"应显示数据语义分组名

## 任务目标

历史对话（以及新建对话发送后）消息组顶部会显示"分组"和"数据语义"两条元数据。之前的实现把"分组"取成了对话分组名（`curConv.groupName / group_name`），而业务要求这里显示的是**数据语义所属分组名**。

## 问题根因

1. `SemanticSelectedData` 只携带了 `name`（数据语义表名）和 `schemaId`，没有保存分组名。
2. ChatInput 中选择数据语义表时只回传了表名和 schemaId。
3. `ConversationAnalysis.handleUnifiedSend` 构造 `meta.groupName` 时错误地使用了 `curConv?.groupName || curConv?.group_name`，这是**对话分组**，不是数据语义分组。
4. `MessageList` 中直接渲染该字段为"分组"，造成歧义。

## 修改文件

- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
  - `SemanticSelectedData` 增加 `groupName?: string`。
  - 选择 schema 时回传 `groupName: g.groupName`。

- `apps/chat/src/components/conversation-analysis/index.tsx`
  - `handleUnifiedSend` 中 `meta.groupName` 改为 `selectedData?.groupName || ''`。

- `apps/chat/src/components/conversation/components/MessageList.tsx`
  - 信息条文案"分组"改为"数据分组"，避免与对话分组混淆。

## 验证

- `pnpm --filter ai-bot exec tsc --noEmit` 通过，无类型错误。
- `pnpm --filter ai-bot lint` 失败，原因是项目 ESLint flat config 配置本身不可用（非本次改动引入）。
- `pnpm --filter ai-bot build` 因构建耗时过长（>180s）超时，输出中仅含 antd "use client" 警告，无本次改动相关错误。

## 风险与备注

- 已存在于后端的旧历史消息如果已经存储了对话分组名，前端重新加载后仍会显示旧值；新发送的消息会按修复后的逻辑显示数据语义分组名。
- 本次修改仅影响消息顶部元数据展示和发送时 `_meta.groupName`，不影响后端 `semantic_id` 等核心参数。
- 工作区中 `chat-input/index.tsx` 和 `MessageList.tsx` 已存在用户未提交的其他改动（如 MCP 图标替换、查看语义交互调整），本次修改未覆盖这些改动，仅追加/调整相关行。
