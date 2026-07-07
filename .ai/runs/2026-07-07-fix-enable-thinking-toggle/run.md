# 修复：点击「思考」后 enable_thinking 仍为 false

## 任务目标

在 `conversation-analysis` 会话分析页面中，底部统一输入框的「思考」按钮点击后，发送请求时 `context.extra.extra_body.enable_thinking` 应为 `true`，但实际仍为 `false`。

## 问题根因

`conversation-analysis/index.tsx` 自己维护了一份 `deepThinkEnabled` 状态，用于渲染统一输入框的「思考」按钮高亮。但实际发请求的 `useConversationController` 内部也维护了一份独立的 `deepThinkEnabled` 状态（初始 false），并且没有任何机制把外部状态同步进去。因此：

- UI 显示「思考」已开启（外部状态为 true）。
- 请求构造时读取的是 controller 内部状态，始终为 false。

## 修改文件

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
  - `ConversationProps` 新增可选属性 `deepThinkEnabled?: boolean`。
  - 计算有效值 `effectiveDeepThinkEnabled`，并使用 ref 在渲染时保持最新值。
  - 在初始化 `paramsData` 和每次 `getAnswer` 发送前，使用 ref 读取最新的有效思考开关状态，避免闭包陈旧。

- `apps/chat/src/components/conversation/index.tsx`
  - 从 props 解构 `deepThinkEnabled` 并透传给 `useConversationController`。

- `apps/chat/src/components/conversation-analysis/index.tsx`
  - 把当前 `deepThinkEnabled` 状态作为 prop 传给 `<Conversation />`。

## 验证

- `pnpm --filter ai-bot exec tsc --noEmit` 通过，无类型错误。
- `pnpm --filter ai-bot lint` 失败，原因是项目 ESLint flat config 配置本身不可用（`env` 键不支持），与本次改动无关。

## 风险与备注

- `refectorview.tsx` 未传递该 prop，controller 会回退到内部状态，行为保持与修复前一致。
- 使用 ref 在渲染时同步有效值，可以在不增加额外重渲染的前提下，保证 `getAnswer` 读取到最新的开关状态。
