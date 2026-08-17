# 大屏对话请求参数对齐 chat 对话 Run Log

## 基本信息

- 日期：2026-08-10
- 任务名称：dashboard-chat-params-align-chat
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（本轮为口头需求，未新增需求条目）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Regression、Review
- 任务类型：前端接口对接（请求传参对齐，无 UI 变化）

## 需求摘要

后端对话接口（agent 相关）已改并部署。大屏智能问答面板（`AiChatPanel`）与 chat 对话调用同一后端接口
`/chat-proxy/api/v2/workflow/chat/completions`，需要把大屏发送的请求参数对齐 chat 对话：
**除大屏专属参数外，其余参数完全仿照 chat 对话。** 经与用户确认：

1. 参数对齐方案 = 完全仿照 chat（删除 chat 已不再发送的字段，改用 chat 的字段结构）。
2. 响应方式 = 保持非流式（只改传参，不改造响应处理逻辑）。

## 影响范围

- `apps/dashboard/src/designer/header/items/ai-chat/AiChatPanel.tsx`（`handleSend` 请求体 + 发送前建会话）
- `apps/dashboard/src/api/BaseApi.ts`（新增 `addChatSession`，第二轮修订）

不涉及：非流式响应处理、历史消息拉取展示、采纳逻辑、语义树选择器、样式。

## 修改文件

- `apps/dashboard/src/designer/header/items/ai-chat/AiChatPanel.tsx`
- `apps/dashboard/src/api/BaseApi.ts`（第二轮修订）

## 实现说明

对齐参考：`apps/chat/src/components/conversation/hooks/useConversationController.ts` 中 `getAnswer` 组装、
经 `streamConvAnswer` 发送的请求体（committed 版本，即当前后端契约）。

`context` 由旧结构改为仿照 chat：

- 删除 chat 不再发送的字段：`agent_id`、`app_code`、`sys_code`、`user_name`、顶层 `chat_id`。
- 新增/改用 chat 字段：`session_id`(=chatIdRef)、`chat_model_id:0`、`app_id:0`、
  `user_id`(从 `SOY-REACT_userInfo.userId` 取，缺失为 0)、`embed_model_id:0`、`last_question:null`；
  `space_id` 由 `String(...)` 改为 `Number(...)`。
- `extra` 新增 `if_debug:true`、`extra_body.enable_thinking:false`（大屏无深度思考开关）；
  `semantic_id/semantic_group_name/semantic_name` 保持（本就与 chat 一致）。

保留的大屏专属参数：

- `context.chat_mode = 'chat_with_dashboard'`
- `context.extra`：`task_type`、`chart_name_list`、`db_name`、`dashboard_id`、`chart_id`、`elements`
- 非流式行为：`stream:false`、`incremental:false`、`enable_vis:true`，以及固定 `model`（大屏无模型选择器）

用户信息读取：由读取 `userName` 改为读取 `userId`（`Number` 转换，`null` 兜底 0），与 chat 完全一致。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p tsconfig.json`（在 `apps/dashboard` 下）

### 测试结果

- `AiChatPanel.tsx` 无任何类型错误。
- tsc 报出的错误均为**既有、与本次改动无关**的问题（`dayjs` 模块解析、未使用变量、`MenuClickEventHandler`
  类型等，分布在 DatabaseConfig/DesignerHeader/ShareDesignerLoader/AbstractDesignerController/HomeMenus/
  ProjectItem/ProjectList/MyScreen 等文件），改动前即存在。

### 失败和修复过程

- 无。

## 回归检查

- 发送前置校验（`请先选择数据语义`）、图表过滤、采纳/互斥逻辑、清空历史、历史拉取均未改动。
- 非流式响应解析（`json.data` → `task_type` → 表格/文本）未改动，与 `stream:false` 一致。
- `handleSend` 的 `useCallback` 依赖数组无需变更（`userId` 内部从 localStorage 计算，refs 不入依赖）。
- 全文件确认无 `userName`/`user_name`/`agent_id`/`app_code`/`sys_code` 残留于请求体；
  剩余 `chat_id:` 仅存在于无关的 `fetchChatConvList` 调用。

## Review 结果

- 仅改请求体字段，未触碰响应处理与业务逻辑，符合“只改传参”的边界。
- 大屏专属字段完整保留，通用字段与 chat 一一对应。

## 发现的问题

- 大屏 tsc 存在若干既有报错（见测试结果），不属本任务范围，未处理。

## 本轮经验

- chat 与大屏对话共用 `/chat-proxy/api/v2/workflow/chat/completions`；chat 侧 committed 请求体是后端契约的权威参考。
- 大屏为非流式（一次性 JSON + 表格渲染），`stream/incremental/enable_vis` 属大屏专属行为，对齐参数时不应改动。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可选：在项目事实中补充“大屏对话与 chat 对话共用同一 chat/completions 接口，大屏为非流式且携带
  task_type/dashboard_id/chart_id 等专属参数”。本轮未改动 context 文档。

### 需要更新的 prompts / agents / skills / MCP / checklists

- 均不需要。

## 后续建议

- 若后端后续要求大屏也走流式，需要同步改造响应处理（当前为一次性 JSON 解析）。

## 未解决问题

- 无。

---

## 补充修订（同日，第二轮）：add 接口获取 conv_uid/session_id + 模型 id

用户反馈：两个模型 id 不应为 0；`conv_uid`、`session_id` 需要**先调用对话的 add 接口**拿到这两个值。
新增接口为 `POST /abi-chat/v1/app/session/add`（即 `http://localhost:9527/api/abi-chat/v1/app/session/add`）。

### 接口来源核对

- chat 侧新建会话走 `createApp`（`apps/chat/src/service/api/app.ts`）→ `POST /abi-chat/v1/app/session/add`。
  - 请求（`mapAppCreateParams`）：`{ appId:0, spaceId, title, userId, groupId:'0', remark? }`。
  - 响应（`mapAppItemToLegacy`）：`data` 同时返回 `sessionId`(→`session_id`) 与 `conv_uid`/`convUid`，即“两个值”。
- 大屏 `FetchUtil`：非 `http`/非 `/chat-proxy/` 前缀的路径会拼 `_apiTarget`（含 `/api`），
  故 `FetchUtil.post('/abi-chat/v1/app/session/add', ...)` 实际请求 `http://localhost:9527/api/abi-chat/v1/app/session/add`，与用户给出的 URL 一致。

### 改动内容

1. `BaseApi.addChatSession({ spaceId, title?, userId? })`：POST `/abi-chat/v1/app/session/add`，
   请求体仿照 chat（`appId:0`、`groupId:'0'`），归一化返回 `{ sessionId, convUid }`（兼容 `sessionId/session_id/chat_id/chatId` 与 `conv_uid/convUid`）。
2. `AiChatPanel`：
   - 新增模块级 `getUserId()`（复用于 `ensureSession` 与 `handleSend`）。
   - 新增 `ensureSession()`：已有 `session_id`+`conv_uid` 直接复用（保留既有对话/历史连续性）；否则调用 `addChatSession` 拿到并写入 `chatIdRef`/`convUidRef` 及模块缓存。
   - `handleSend` 发送前 `await ensureSession()`，失败则 `message.error('创建会话失败，请稍后重试')` 并中止（此时不追加占位消息、不清空输入，便于重试）。
   - `chat_model_id` 由 `0` 改为 `12`（大模型默认）；`embed_model_id` 由 `0` 改为 `6`（嵌入模型默认）。
   - `handleSend` 依赖数组新增 `ensureSession`。

### 第二轮测试

- `npx tsc --noEmit -p tsconfig.json`（在 `apps/dashboard` 下）：`AiChatPanel.tsx`、`BaseApi.ts` 均无类型错误；
  仅剩既有无关报错（`dayjs` 模块解析、未使用变量、`MenuClickEventHandler` 类型等）。

### 第二轮回归

- `ensureSession` 复用优先：命中历史/既有会话时不重复建会话，避免产生重复空会话。
- 建会话失败时不产生孤立的占位 AI 消息、输入保留可重试。
- 非流式响应解析、采纳/互斥、清空历史、语义选择器均未改动。

### 决策记录

- add 调用时机采用 **懒建（发送前 ensureSession）+ 复用**，等价于 chat 的 `ensureConv` 语义：
  已有会话复用、无会话才新建，避免每条消息或每次挂载都新建会话。
