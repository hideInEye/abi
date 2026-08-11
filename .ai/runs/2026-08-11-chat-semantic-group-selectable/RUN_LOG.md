# 数据选择下拉支持选中数据语义分组（group_id）Run Log

## 基本信息

- 日期：2026-08-11
- 任务名称：chat-semantic-group-selectable
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test、Regression
- 任务类型：前端功能（涉及对话/报告请求字段协议）

## 需求摘要

chat 输入框「数据选择」下拉（DatabaseOutlined 触发的 Popover 树）此前只能选中数据语义叶子节点（`semantic_id`），需要让分组节点（`group_id`）也能被选中并发送。经与用户澄清确认的关键决策：

- 后端字段：选中分组时发送 `group_id` 并清空数据语义叶子 id（交互模式 `semantic_id`、报告模式 `schema_id`），二者互斥、二选一。
- 交互方式：点击分组行一次即「同时选中该分组 + 切换展开/收起」。
- 生效范围：交互模式与报告模式都支持；空分组（无子节点）也可被选中并发送其 `group_id`。

## 影响范围

- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
- `apps/chat/src/components/conversation/components/chat-input/sendValidation.ts`
- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`
- `apps/chat/src/service/api/report.ts`
- `apps/chat/src/index.css`

## 修改文件

- `chat-input/index.tsx`
  - `SemanticSelectedData` 新增 `groupId?: number | string`（与 `schemaId` 互斥）。
  - `renderSemNode` 让分组节点可选中：分组真实 id 取 `node.groupId ?? node.id`；有子节点的分组点击「选中 + `onToggleSemGroup` 展开/收起」，空分组点击直接选中；叶子点击行为保持不变（选中并关闭下拉）。选中态附加 `selected` className。
- `chat-input/sendValidation.ts`
  - `SelectedSemanticData` 增加 `groupId?`；发送前置校验改为 `schemaId || groupId || file_id` 任一即可。
- `conversation-analysis/index.tsx`
  - 交互发送 meta 增加 `semanticGroupId: selectedData?.groupId`；`Conversation` 增加 prop `semanticGroupId={selectedData?.groupId}`（供报告模式使用）。
- `conversation/index.tsx`
  - `ConversationHandle.handleSend` 的 meta 类型增加 `semanticGroupId?`；`useReportConversation` 调用透传 `groupId: props.semanticGroupId`。
- `useConversationController.ts`（交互模式）
  - `ConversationProps` 增加 `semanticGroupId?`；`handleSend` meta 类型增加 `semanticGroupId?`。
  - 请求 extra 注入按互斥规则改造：有本轮 meta 时按 meta 决定、无 meta 回退组件当前选择（`metaHasSemanticData` 门控），选中分组则 `group_id=groupId` 且 `semantic_id=null`，否则 `semantic_id=schemaId` 且删除 `group_id`。
  - human 消息新增 `_semanticGroupId`；`extractSemanticMetaFromMessages` 解析 `group_id`；`onHistorySemanticLoaded` 类型与调用透传 `groupId`；编辑重发/重新生成透传 `semanticGroupId`（仅取该轮原始值，不回退当前输入框，避免污染）。
- `report-mode/useReportConversation.ts`（报告模式）
  - `UseReportConversationOptions` 增加 `groupId?`；hook 解构 `groupId`；`requestData` 按互斥规则：选中分组则 `schema_id=''` 且带 `group_id`，否则 `schema_id=schemaId ?? ''`；`useCallback` 依赖数组加入 `groupId`。
- `service/api/report.ts`
  - `SubmitReportRequest` 增加可选 `group_id?: number | string`（与 `schema_id` 互斥）。
- `index.css`
  - 移除 `.sem-group-node.is-empty` 的 `cursor: default` 与透明 hover，使空分组沿用可点击的 pointer 与 hover；新增 `.sem-group-node.selected`（背景 `--accent-soft`、文字/图标 `--accent`），靠源码顺序覆盖空分组灰色文字。

## 实现说明

- 分组与叶子互斥在「请求构建层」统一裁决：交互模式在 `useConversationController` 的 extra 注入处，报告模式在 `useReportConversation` 的 `requestData` 处；两处均遵循「有 groupId 则发 group_id 并清空叶子 id」。
- 重新生成/编辑重发的 `semanticGroupId` 只取该轮 human 消息携带值或历史回填值（`?? null`，不回退 `props.semanticGroupId`），配合请求层 `metaHasSemanticData` 门控，避免「重发一条叶子轮次时被输入框当前分组选择污染」以及「分组轮次被残留叶子 id 干扰」。
- 分组真实 id 采用 `node.groupId ?? node.id` 兜底，兼容树节点未单独暴露 `groupId` 的情况。
- 历史恢复依赖后端在 view/ai 内容 JSON 回显 `group_id`；未回显时不影响同会话内的重发（human 消息已携带 `_semanticGroupId`）。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p tsconfig.json`（apps/chat，references 空壳，仅验证配置）
- `npx tsc --noEmit -p tsconfig.app.json`（apps/chat，真正覆盖 `src`）

### 测试结果

- `tsconfig.app.json` 类型检查：本次改动的 8 个文件均无任何类型错误。
- 仅有 3 处既有报错，全部集中在未改动文件 `apps/chat/src/components/conversation/autoChart/multi-measure-pie-chart.ts:72`（`.ts` 文件内含 JSX `return <div ref={chartRef} />`，属 `.tsx` 误命名），`git status` 确认该文件未被本次改动，属仓库既有问题（vite/esbuild 宽容、严格 tsc 报错）。

### 失败和修复过程

- 编辑 `conversation/index.tsx` 后一度出现 2 个预期类型错误（`groupId` 不在 `UseReportConversationOptions`、`semanticGroupId` 不在 `ConversationProps`），随后在 `useReportConversation.ts` 与 `useConversationController.ts` 补齐类型定义后消除。

## 回归检查

- 叶子选中链路（`semantic_id` / `schema_id`）行为完全不变：未选分组时互斥分支走 else，等价于原逻辑。
- Excel 发送、`chat_mode` 判定、深度思考开关注入均未改动。
- 报告模式提交除新增互斥的 `schema_id/group_id` 外，其余字段与依赖不变。
- 校验函数对「仅 Excel」「仅叶子」两种旧场景结果不变，新增「仅分组」可通过。
- CSS 仅调整空分组可点击性并新增 `.selected` 选择器，未覆盖既有叶子/分组基础样式。

## Review 结果

- 未新增接口、未大范围重构无关模块；改动聚焦数据选择与请求字段。
- 互斥裁决集中在请求构建层，交互/报告两条链路规则一致，降低分叉风险。
- 未触碰用户已有的未说明改动（abi 下文件、skill/index.tsx、CURRENT_REQUIREMENT.md 保持原样）。

## 发现的问题

- 既有问题：`apps/chat/src/components/conversation/autoChart/multi-measure-pie-chart.ts` 为含 JSX 的 `.ts` 文件，严格 tsc 报语法错。与本任务无关，未纳入本次改动；建议后续单独将其改名为 `.tsx`（需同步 import 路径）。

## 本轮经验

- 「分组 / 叶子」这类互斥选择，应在请求构建层统一裁决并显式清空对端字段，而非在多个入口各自拼装，避免重发/历史回填时字段串味。
- 重发/重新生成透传语义元信息时，只取该轮原始值、不回退当前输入框选择，可避免跨轮次污染。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可在 `MODULE_MAP.md` 或数据语义相关说明处补记：数据选择支持分组（`group_id`）与叶子（`semantic_id`/`schema_id`）互斥。非阻塞，建议后续补充。

### 需要更新的 prompts / agents / skills / MCP / checklists

- 均不需要。

## 后续建议

- 后端在对话/报告的 view/ai 回显中带上 `group_id`，可让历史会话重新打开时正确回填分组选中态。
- 人工在浏览器验收：分组（含空分组）可点击、选中高亮、交互与报告两种模式发送的字段符合互斥预期。

## 未解决问题

- 未启动 dev server 做浏览器视觉与网络请求验收；建议人工确认分组选中高亮及请求体 `group_id`/`semantic_id`(`schema_id`) 互斥。
