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
