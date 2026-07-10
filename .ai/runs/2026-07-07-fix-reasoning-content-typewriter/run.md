# 修复：reasoning_content 无实时打字机效果

## 任务目标

后端 SSE 流中返回 `delta.reasoning_content`（如 deepseek-v4-flash），但前端没有实时打字机效果，消息区域空白；同时存在 `content` 与 `reasoning_content` 同时返回、content 为固定前缀重复发送的另一种模式。

## 问题根因

`useConversationController.ts` 的 `onmessage` 解析逻辑只读取 `delta.content`，当 `content` 为 `null` 时直接 `return` 跳过该事件。对于把思考过程放到 `reasoning_content` 字段的模型，所有有效内容都被丢弃，导致 `messageRef` 始终为空，无法触发实时渲染。

后续发现另一种返回模式：`content` 与 `reasoning_content` 同时存在，`content` 在推理阶段是固定前缀（如 `"通用数据生成器："`）且每帧重复发送，真正的推理过程在 `reasoning_content` 中，回答阶段再切回 `content`。原 `if-else` 逻辑会重复追加前缀并漏掉 reasoning 内容。

## 修改文件

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
  - 新增 `isReasoningRef`，标记当前是否处于 reasoning_content 段落。
  - 新增 `lastContentRef`，记录上一次已追加的完整 content，过滤后端重复发送的固定前缀。
  - 解析 SSE chunk 时，同时读取 `delta.content` 与 `delta.reasoning_content`。
  - `reasoning_content` 仅在开启深度思考（`effectiveDeepThinkEnabledRef.current` 为 true）时处理，进入时追加 `<think>`，切回 content 或收到 `[DONE]` 时追加 `</think>`，复用现有思考内容实时展示逻辑。
  - `content` 与上一次记录值对比，取增量部分追加，避免重复前缀被多次写入。
  - 在 `getAnswer` 开始时重置 reasoning 与 lastContent 状态，在 `[DONE]` 处理中闭合 reasoning 标签。

## 验证

- `pnpm --filter ai-bot exec tsc --noEmit` 通过，无类型错误。
- `pnpm --filter ai-bot lint` 因项目 ESLint flat config 本身不可用而失败，与本次改动无关。

## 风险与备注

- 仅影响 OpenAI 兼容 SSE 中 `reasoning_content` 的解析路径；原有纯 `content` 路径仍正常工作。
- `<think>` 自动包裹后，现有 `AiEle` 思考节点解析、思考时间计算逻辑均可继续工作。
- 当后端同时返回 `content` 和 `reasoning_content` 时，两者会分别追加：reasoning 内容置于 `<think>` 内，content 增量置于 `<think>` 外，避免前缀重复。
- reasoning_content 的展示受「思考」开关控制：未开启时 reasoning_content 会被跳过，不触发实时打字机效果。

## 数据渲染排查

### 参考项目 chat 的处理方式

参考项目 `trust-abi-web/chat` 同样使用 `/chat-proxy/api/v2/workflow/chat/completions` 流式接口：

- `[DONE]` 时前端添加 `role: 'view'`、`context: 'describe'` 的消息。
- `ViewEle` 渲染该 view 消息后，自动调用 `searchConv` 查询后端存储的 view 消息（含 `data` + `sql`）。
- 参考项目的 `PredictionAnalysis` 组件接收 `data.result_df` 渲染预测图表。

因此参考项目也依赖后端生成 view 消息；若后端未生成，同样会出现“无数据”。

### 当前问题根因

用户提供的 `预测分析.txt`（deepseek-v4-flash SSE）中，流式返回的 JSON 是 DSL 形态：

```json
{
  "thoughts": "...",
  "chat_mode": "chat_with_db_execute",
  "metrics": "SUM(t_order.total_amount)",
  "dimensions": ["t_order.order_date"],
  "filters": [],
  "display_type": "response_line_chart",
  "dialect": "mysql"
}
```

该 JSON **没有 `sql` 和 `data`**。当前 `[DONE]` 时只添加 `context: 'describe'`，`ViewEle` 调用 `searchConv` 查询 view 消息，但后端未生成 view 消息，故无数据。

对比 `apps/abi/.../conversation/conversation.tsx`：该模块使用 `/v1/chat/completions`，返回的 JSON 含 `sql`，前端在 `[DONE]` 后主动调用 `fetchDataBySql` 查询数据并刷新历史。当前 chat 应用缺少这一主动查询步骤。

### 本次新增修复

- `useConversationController.ts`
  - 导入 `fetchDataBySql`。
  - 新增 `extractTrailingJson` 工具函数，用于从 `messageRef` 尾部提取结构化 JSON。
  - `[DONE]` 处理中：若提取到的 JSON 包含 `sql` 且 `conv.dbName` 存在，主动调用 `fetchDataBySql` 查询数据，将 `{ ...json, data, sql }` 作为 view 消息的 `context`，并设置 `arrowStatus: true`，让 `ViewEle` 直接渲染而无需再调用 `searchConv`。
  - 清理了之前添加的调试 `console.log`。

### 验证

- `pnpm --filter ai-bot exec tsc --noEmit` 通过。

### 风险与备注

- 本次修复可解决 SSE 返回的 JSON 中直接包含 `sql` 的场景。
- 对于 `预测分析.txt` 这种仅返回 DSL（metrics/dimensions/filters/display_type/dialect）的场景，仍缺少把 DSL 转成 `sql` + `data` 的环节，需要进一步确认：
  1. 后端是否应当在 `/chat-proxy/api/v2/workflow/chat/completions` 流式输出中返回完整 JSON（含 `sql`/`data`）？
  2. 或者前端应调用哪个接口把该 DSL 转成 SQL 并查询数据（如 `/chat-proxy/api/v1/chat/completions` 非流式、`/chat/v1/chat/assembleSql` 等）？
  3. 或者当前 chat 应用是否应切换到 `/v1/chat/completions` 以复用 ABI 应用的 `sql` 返回模式？
