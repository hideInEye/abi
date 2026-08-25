# Chat 助手对接对话（查看抽屉「调试预览」内直接对话）Run Log

## 基本信息

- 日期：2026-08-25
- 任务名称：chat-assistant-start-chat
- 需求来源：用户直接下达（chat 应用「我的助手」尚未对接对话，要求补齐；用户明确纠正实现方式：**参照 abi 助手，在查看页（详情抽屉）内直接发送消息**，而非跳转对话页。`.ai/requirements/CURRENT_REQUIREMENT.md` 仍为旧报告模式需求，未包含本轮任务）
- 执行 AI：Qoder
- 任务类型：功能对接（最小改动）

## 需求摘要

chat 应用「应用工坊 → 我的助手」查看抽屉（AssistantDetailDrawer）右栏「调试预览」此前为死壳 UI（输入框无状态、推荐问题无点击）。本次对齐 abi 管理端 `assistant-edit-drawer.tsx` 的调试预览实现：

- 首次发送时懒创建绑定助手 appId 的调试会话（`/abi-chat/v1/app/session/add`）；
- 之后走探索模式流式接口 `POST /chat-proxy/api/v2/chat/plan`（`streamExplorePlan`，SSE）；
- 右栏渲染探索模式对话时间线（`ExploreMessageRow`），点击条目打开预览 Drawer（`ExplorePreviewPane`）；
- 推荐问题点击即发送；输入框支持回车/图标发送，生成中可停止。

## 非目标

- 不在卡片新增「开始对话」按钮、不跳转对话页（第一版方案已被用户否定并完整回退）。
- 不改动 abi 应用、大屏（dashboard）、对话页三种发送模式。
- 不新增后端接口封装，复用现有 `createApp`（session/add）与 `streamExplorePlan`（chat/plan）。

## 影响范围

- `apps/chat/src/pages/chat/workshop/useAssistantDebugChat.ts`（新增）
- `apps/chat/src/pages/chat/workshop/AssistantDetailDrawer.tsx`
- `apps/chat/src/service/api/app.ts`（仅保留 appId 透传，其余第一版改动已回退）

## 修改文件

- `pages/chat/workshop/useAssistantDebugChat.ts`（新增，197 行）：
  - 复刻 abi 同名 hook：`ensureSession()` 首次发送时 `createApp({ appId, space_id, title: '助手调试对话' })` 取 `chat_id`/`conv_uid`；
  - payload 与 abi 一致：`messages`、`app_id`、`space_id`、`schema_id`、`group_id: Number(appId)`、`conv_id`、`session_id`、`user_id`、`embed_model_id`（默认 6）、`chat_model_id`、`is_debug`、`chat_mode: 'copilot'`、`skills_source_version_ids`、`sse_mcp_source_version_ids`、`mcp_streamable_source_version_ids: []`；
  - SSE 处理复用 `parseExploreStreamEvent`/`reduceExploreEvent`；支持 `stopGenerating`（abort 置 cancelled）；
  - 比 abi 多一处：`appId` 变化时自动 `resetSession`（chat 抽屉常驻挂载，防止切换助手沿用旧会话）。
- `pages/chat/workshop/AssistantDetailDrawer.tsx`：
  - 新增 `chatInput`/`previewId`/`debugScrollRef` 状态；
  - 派生 `firstSchemaId`（剥 `schema_` 前缀）、`debugChatModelId`（剥 `model_`）、`skillSourceVersionIds`（剥 `skill_`），与 abi 抽屉同款逻辑；
  - 调用 hook：`useAssistantDebugChat({ appId, spaceId: getSpaceId(), schemaId, chatModelId, isDebug: enableDebug })`；
  - 右栏接线：问候语气泡下渲染 `ExploreMessageRow` 时间线；推荐问题 Tag `onClick` 发送；Input 接 `value/onChange/onPressEnter`，suffix 生成中为 `LoadingOutlined`（点击停止），否则 `SendOutlined`（点击发送）；发送后双 rAF 滚动到底；
  - 新增嵌套预览 Drawer（width 680，placement right）渲染 `ExplorePreviewPane`，从实时列表按 id 取条目保证流式同步。
- `service/api/app.ts`：
  - 保留 `mapAppCreateParams` 的 `appId` 透传：`data.appId ?? data.app_id ?? 0`（默认 0，普通新建对话行为不变；调试会话创建依赖该透传）。

## 已回退的第一版方案（用户否定）

- `pages/chat/workshop/index.tsx`「开始对话」按钮及 `handleStartAssistantChat`：已完全回退，恢复为仅「查看」。
- `components/conversation-analysis/index.tsx` 的 `appListLoaded` + `fetchSessionDetail` 兜底加载：已完全回退为原始实现。
- `service/api/app.ts` 的 `fetchSessionDetail` 映射：已回退为原始版。

## 验证

- `npx tsc --noEmit -p tsconfig.app.json`：仅剩 `multi-measure-pie-chart.ts` 的历史遗留错误（.ts 文件内 JSX，历次任务均已记录，与本次无关），本次改动文件无新增错误。
- 未运行浏览器联调（需要后端会话与探索接口环境）；行为等价性说明：
  - 普通新建对话仍走 `appId=0`（未传 appId 时映射结果与原来一致）；
  - 抽屉右栏 UI 结构、交互、payload 与 abi `assistant-edit-drawer.tsx` 调试预览逐项对齐（abi 的 `draftSaved` 锁定为编辑场景特有，查看场景不引入）。

## 风险与未解决事项

- 调试会话每次切换助手会重置，但同一助手每次首次发送都会新建会话（与 abi 一致）；如需复用既有调试会话，需要后端按 appId 查询会话，本次未做。
- `ExploreMessageRow`/`ExplorePreviewPane` 样式基于对话页探索模式 CSS Module，在抽屉右栏内直接复用，若视觉需要微调可后续处理。

## 是否更新 .ai 其他目录

- 不需要更新 `.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/checklists`、`.ai/decisions`。
