# 2026-08-31 助手开场引导回显 + 助手会话欢迎页 + 数据语义默认选中第一个

## 任务来源

用户截图反馈（管理端助手配置 vs chat 用户端对比）：
1. 管理端设置了开场引导，chat 端助手查看抽屉显示「暂未设置开场引导」。
2. 点击助手卡片进入对话页后，空白区要展示对应助手开场引导（类欢迎页、无推荐问题）。
3. 输入框「数据」数据语义默认选中第一个。

## 根因分析

1. `apps/chat/src/pages/chat/workshop/AssistantDetailDrawer.tsx` `loadDetail()` 从未读取 `version.prologue`，且开场引导折叠块误用助手画像 `prompt` 渲染。管理端（abi `assistant-edit-drawer.tsx`）读 `version.prologue` 并在保存 payload 携带 `prologue`，接口本身有返回。
2. 点击助手卡片逻辑为 `createApp` 立即创建绑定会话后跳转（`workshop/index.tsx handleEnterAssistantChat`）；新会话消息区为空时仅渲染空白滚动容器，无欢迎态。
3. `conversation-analysis/index.tsx` 的 `selectedData` 初始为 null，仅靠手动点选或历史回填赋值。

## 变更内容

- `AssistantDetailDrawer.tsx`：新增 `prologue` 状态，`loadDetail` 读 `version.prologue || detail.prologue`；开场引导块改渲染 `prologue`。
- `assistantResources.ts`：`AssistantBoundResources` 增加 `prologue` / `description` 字段（同一 app/get 响应映射，不新增请求）。
- `NewChatWelcome.tsx`：新增可选 `title` / `subtitle` / `hideExamples` props，默认行为不变。
- `conversation/index.tsx` + `hooks/useConversationController.ts` + `components/MessageList.tsx`：新增 `emptyContent?: ReactNode` 透传链；MessageList 非虚拟化分支在 `mergedGroups` 为空时渲染 `emptyContent`，并为欢迎页补 `h-full` 以垂直居中。
- `conversation-analysis/index.tsx`：
  - 模块级 `findFirstSchemaLeaf` 深度优先取首个 schema 叶子；
  - 默认选中第一个 effect：`selectedData` 为空且候选就绪时自动选中（助手会话等 `boundResourcesLoading` 结束；历史回填后不覆盖）；
  - `assistantWelcome` memo：助手会话（appId≠0）且绑定资源已加载时构造 `<NewChatWelcome hideExamples title=助手名 subtitle=开场引导||描述>`，经 `emptyContent` 传入 Conversation。

## 验证

- `apps/chat` 执行 `npx tsc --noEmit -p tsconfig.app.json`：本次修改文件 0 报错；唯一报错文件 `src/components/conversation/autoChart/multi-measure-pie-chart.ts` 为存量问题（.ts 内含 JSX，vite/esbuild 构建不做类型检查），与本次无关。
- 无法启动联调环境做端到端验证（需 251 后端）；行为等价说明：
  - 普通会话欢迎页（routeChatId='new'）渲染路径未变（NewChatWelcome 默认 props）。
  - 有消息会话：`mergedGroups` 非空，`emptyContent` 不渲染，行为不变。
  - 历史会话语义回填：`onHistorySemanticLoaded` 在默认选中之后到达时覆盖默认值，保持原行为。

## 回归检查

- 助手查看抽屉其余区块（模型/语义/技能/工具/示例/调试预览）渲染逻辑未动。
- ChatInput 数据语义弹窗选择逻辑未动，仅父级初始值变化。
- 分享/批量删除/报告/探索模式均不使用 emptyContent，无影响。

## 后续建议

- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
