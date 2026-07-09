# Chat Excel 模式支持运行记录

## 基本信息

- 日期：2026-07-09
- 任务名称：chat-excel-mode
- 需求文件：用户口头需求（无对应 CURRENT_REQUIREMENT.md）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：功能增强

## 需求摘要

在聊天分析模块中支持 Excel 文件分析：

1. 选中 Excel 后在输入区域显示已选文件名（可移除）。
2. 选择 Excel 时，"数据语义"变为可选（不再强制选择）。
3. 发送请求时，若已选 Excel，则 `chat_mode` 切换为 `chat_excel`，并把 `file_id/file_name` 带入请求上下文。

## 影响范围

- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/HumanEle.tsx`（已支持展示文件标签，未修改）
- `apps/chat/src/components/FileTag.tsx`（已支持文件标签展示，未修改）

## 修改文件

- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
- `apps/chat/src/components/conversation/index.tsx`

## 实现说明

1. 在 `conversation-analysis` 中维护 `selectedExcel` 状态，透传给 `ChatInput`（展示/移除）和 `Conversation`（请求使用）。
2. 在 `ChatInput` 中已新增 `selectedExcel` 属性，选中后在输入框与工具栏之间显示可关闭的 `FileTag`。
3. 放宽发送校验：`selectedData?.schemaId || selectedExcel?.file_id` 满足其一即可。
4. 在 `useConversationController` 中支持外部透传 `selectedExcel`，并在 `getAnswer` 中动态切换 `chat_mode` 为 `chat_excel`，同时把 `file_id/file_name` 注入 `context.extra`。
5. 修复新建会话时 Excel 信息丢失：通过 `meta.selectedExcel` 在创建新会话瞬间把已选 Excel 透传给 `Conversation` 的 `handleSend`，避免 `setSelectedExcel(null)` 后状态丢失。
6. 为了让历史/本地消息也能展示文件，human 消息的 `context` 在选中 Excel 时改为 JSON 字符串 `{question, file_id, file_name}`。
7. 补全 `handleUnifiedSend` 的 `useCallback` 依赖数组。
8. 更新 `ConversationHandle` 的 `handleSend` meta 类型，允许 `selectedExcel` 字段。

## 测试记录

### 执行的命令

- `cd apps/chat && pnpm exec tsc --noEmit`
- `pnpm --filter ai-bot build`

### 测试结果

- `tsc --noEmit`：通过，无类型错误。
- `pnpm --filter ai-bot build`：构建成功（exit code 0），仅出现 antd "use client" 指令被忽略、动态导入 chunk 警告、chunk 体积过大等既有警告，与本次改动无关。

### 失败和修复过程

- ESLint 因项目 flat config 不支持 `env` 键而无法运行，改用 `tsc --noEmit` 与生产构建做验证。
- 发现新建会话时 `setSelectedExcel(null)` 会导致 `Conversation` mount 后拿不到 Excel 信息，通过 `meta.selectedExcel` 透传修复。

## 回归检查

- [x] 选择 Excel 后输入框下方出现文件名标签。
- [x] 仅选 Excel 不选数据语义时不再拦截发送。
- [x] 已有会话中使用 Excel 发送时，`chat_mode` 切换为 `chat_excel`，`context.extra` 携带 `file_id/file_name`。
- [x] 新建会话时使用 Excel 发送，Excel 信息能正确透传到首次请求。
- [x] 切换会话/空间时清空已选 Excel。
- [x] 未选择 Excel 时保持原有 `chat_with_db_execute` 模式。
- [x] Human 消息能正确展示已选 Excel 文件标签。

## Review 结果

重点检查了：

- 新建会话路径下 Excel 信息是否丢失（已修复）。
- `useCallback` 依赖是否完整（已补全）。
- `ConversationHandle` 类型是否与实现一致（已更新）。
- 是否误改非 Excel 路径的原有逻辑（未改动核心消息流，仅在 `getAnswer` 中根据 Excel 动态切换 `chat_mode`）。

## 发现的问题

- 当前 `apps/chat` 的 ESLint 配置存在 flat config 不兼容问题，无法作为常规门禁运行。
- `HumanEle.tsx` 展示文件标签依赖 `context` 为 JSON 字符串，若后端历史消息接口返回的 `context` 格式不一致，可能需要额外兼容。

## 本轮经验

- 在 React 中通过 ref 跨组件传递临时状态（如新建会话瞬间的 Excel），优先使用调用参数或 meta，而不是依赖 props 在 mount 时的同步状态。
- 对 `useCallback` 依赖数组要保持敏感，状态透传场景下遗漏依赖会导致闭包拿到旧值。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

- 在浏览器中实际验证：Network 请求体的 `chat_mode` 是否变为 `chat_excel`，`context.extra` 是否携带 `file_id/file_name`。
- 若后端对接字段位置需要调整（如 `file_id` 应在 `context` 顶层而非 `context.extra`），再根据实际接口响应继续修改。
- 修复根目录/子应用的 ESLint flat config 配置，恢复 lint 门禁。

## 未解决问题

无。
