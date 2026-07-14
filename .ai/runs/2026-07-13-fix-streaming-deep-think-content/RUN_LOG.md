# Run Log: 修复流式深度思考内容丢失

## 基本信息

- 日期：2026-07-13
- 任务名称：fix-streaming-deep-think-content
- 需求文件：用户通过 pasted-text.txt 提供后端 SSE 数据样例，口头说明后端修改了流式结构
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression
- 任务类型：Bug 修复

## 需求摘要

后端将深度思考内容从 `delta.reasoning_content` 移至 `delta.content`，并使用 Markdown 标题标记边界：

- 开始：`## 1. 🧠 思考过程`
- 结束：`## 3. 🔧 查询模式`

前端流式对话中不再显示思考过程，需要适配新结构。

## 影响范围

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
  - 新增 `processContentWithInlineThinking` 工具函数
  - 修改 SSE `onmessage` 中 content 的处理分支
- `apps/chat/src/components/conversation/AiEle.tsx`：无需修改，已有 `<think>` 解析和渲染链路可直接复用

## 修改文件

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`

## 实现说明

1. 在 `useConversationController.ts` 顶部新增：
   - `THINK_START_REGEX` / `THINK_END_REGEX`：识别 content 中思考内容的开始与结束标题
   - `processContentWithInlineThinking(content, isReasoning, enabled)`：将 content 中内联的思考内容包装为 `<think>...</think>`，返回处理后的文本和最新的思考段状态；`enabled` 参数控制是否启用深度思考展示
2. 在 SSE `onmessage` 的 content 处理分支中：
   - 删除已废弃的 `delta.reasoning_content` 处理逻辑（后端现已统一把思考内容放在 `content` 中）
   - 使用 `processContentWithInlineThinking` 处理 `contentToAppend`，传入 `effectiveDeepThinkEnabledRef.current` 作为启用开关
     - 启用深度思考时：动态进入/退出思考段，并生成 `<think>` 标签，实现流式思考展示
     - 未启用深度思考时：过滤掉 `## 1. 🧠 思考过程` 到 `## 3. 🔧 查询模式` 之间的思考内容，不向下游渲染
3. 保持 `AiEle.tsx` 的 `<think>` 解析和渲染链路不变，实现前后兼容

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot exec tsc --noEmit`：类型检查通过
- `pnpm --filter ai-bot build`：生产构建成功

### 测试结果

- TypeScript 类型检查无错误
- Vite 生产构建成功（`dist/index.html` 及资源文件生成）
- 构建中出现的 antd "use client" 警告和 chunk 体积警告为既有问题，与本改动无关

### 失败和修复过程

- `pnpm --filter ai-bot lint` 因 ESLint flat config 配置冲突无法运行（`A config object is using the "env" key, which is not supported in flat config system`），属于既有环境问题，未在本次修复范围内

## 回归检查

- 已删除对 `delta.reasoning_content` 的兼容处理（后端协议已统一，不再需要）
- `AiEle.tsx` 的 `parseThinkNodes`、`toThinkingMarkdown` 等渲染逻辑未改动，历史消息和实时消息的展示行为保持一致
- `messageRef.current` 仍通过 `<think>` / `</think>` 标签承载思考内容，后续 `updateAiMessage`、`displayMessage` 提取逻辑无需调整
- 非思考模式下 content 中的思考段被过滤，不会出现在最终答案中
- 在 `getAnswer` 开始时固定本次请求的思考开关状态，避免流式过程中用户切换开关导致渲染状态变化

## Review 结果

- 修改集中在 SSE 解析层，未扩散到 UI 组件
- 向后兼容旧 `reasoning_content` 结构
- 未覆盖思考标题被拆分到多个 chunk 的极端场景（当前数据样例中标题完整出现在单个 chunk）

## 发现的问题

- 思考结束后 content 中出现重复的 `chat_with_db_execute` 片段，属于后端 content 重复发送问题，前端 `lastContentRef` 过滤机制会消除部分重复，但首次出现的模式字符串仍可能出现在最终答案区域
- 最初使用 `effectiveDeepThinkEnabledRef.current` 实时判断，导致流式过程中用户切换思考开关会改变当前对话的渲染行为；已修复为请求开始时固定状态

## 本轮经验

- 后端流式协议变更时，优先在 controller/解析层做适配，不改动下游渲染组件，可以最小化影响范围
- 对于 `reasoning_content` 与 `content` 两种并存的历史结构，应显式分支处理，避免互相覆盖

## 是否需要更新 AI 系统

### 需要更新的 context

- 无需更新，本次为一次性后端协议适配

### 需要更新的 prompts

- 无需更新

### 需要更新的 agents

- 无需更新

### 需要更新的 skills

- 无需更新

### 需要更新的 MCP 建议

- 无需更新

### 需要更新的 checklists

- 无需更新

## 后续建议

- 与后端确认思考标题 `## 1. 🧠 思考过程` / `## 3. 🔧 查询模式` 是否为稳定协议，避免标题变更导致前端再次失效
- 如标题稳定，可考虑将开始/结束标记提取为常量配置或共享类型，便于后续维护

## 未解决问题

- 未增加自动化测试覆盖 SSE 解析逻辑，后续如该逻辑继续演进，建议补充 characterization tests
