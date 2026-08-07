# Run Log: 修复数据知识场景深度思考不展示

## 基本信息

- 日期：2026-08-07
- 任务名称：fix-chat-with-knowledge-thinking
- 需求文件：用户通过 pasted-text.txt 提供后端 SSE 数据样例，口头说明新增 chat_with_knowledge（数据知识）场景下 AI 思考未打印
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression
- 任务类型：Bug 修复

## 需求摘要

深度思考模式下，新增的 `chat_with_knowledge`（数据知识）场景 AI 思考内容未展示。

该场景的 `delta.content` 累积为以 `thoughts` 为首字段的 JSON：

```json
{ "thoughts": "……", "chat_mode": "chat_with_knowledge", "data_knowledge": "……" }
```

- 与 `chat_with_db_execute` 不同：没有 `## 1. 🧠 思考过程` / `## 3. 🔧 查询模式` 标记
- 与归因分析不同：思考内容不在 `delta.reasoning_content` 逐字下发

因此 `processContentWithInlineThinking` 不会生成 `<think>` 标签，显示逻辑取不到思考内容，思考卡片为空。

用户确认范围：答案区（data_knowledge）已能正常展示，本次仅修复思考展示；思考按流式逐字展示，与问数/归因模式一致。

## 影响范围

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
  - 新增 `extractKnowledgeThoughts` 纯函数
  - 修改 SSE `onmessage` 中的 `displayMessage` 提取逻辑
  - 修改 `[DONE]` 分支的思考态结束/计时逻辑
- `apps/chat/src/components/conversation/ViewEle.tsx`：无需修改，已有 data_knowledge 渲染链路
- `apps/chat/src/constant/chat.ts`：无需修改，CHAT_MODE_MAP / SUB_CHAT_MODE_MAP / chatModeWithModels 已含 chat_with_knowledge

## 修改文件

- `apps/chat/src/components/conversation/hooks/useConversationController.ts`

## 实现说明

1. 新增纯函数 `extractKnowledgeThoughts(raw)`：
   - 用正则 `/^\s*\{\s*"thoughts"\s*:\s*"/` 识别「以 `{ "thoughts": "` 开头」的累积内容，天然排除以 `##` 开头的 chat_with_db_execute
   - 从 thoughts 值起始位置增量扫描，遇未转义 `"` 结束；保留 `\` 转义序列原文，交由下游统一反转义
   - 命中返回 thoughts 文本（值未闭合时返回已到达部分，支持流式逐字），非该结构返回 `null`
2. 显示逻辑（`displayMessage` 提取）：
   - **始终**调用 `extractKnowledgeThoughts`（不再依赖 `currentDeepThinkEnabled`），命中则以 thoughts 作为流式思考内容（`\\"`→`"`、`\\n`→换行）
   - 未命中走原有 `<think>` 提取分支，行为不变
   - 依据：thoughts 是后端结构化字段（与 `reasoning_content` 门控模式不同），无论深度思考开关是否开启都会下发；正则只匹配「`{ "thoughts": "`」开头，不会误伤其他模式
3. `[DONE]` 分支：
   - 除原 `</think>` 判定外，增加 `isKnowledgeThoughts` 判定（同样不依赖 `currentDeepThinkEnabled`）；命中时 `updateAiMessage({ smLoading:false, isDone:true, thinkTime })`，显式结束思考态并记录「思考了 Xs」
4. 不改动 `messageRef` 结构、`extractTrailingJson`、`[DONE]` 的答案/view 链路，也不改 `AiEle.tsx` / `ViewEle.tsx` 渲染

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot exec tsc --noEmit`：类型检查通过
- `pnpm --filter ai-bot build`：生产构建成功

### 测试结果

- TypeScript 类型检查无错误
- Vite 生产构建成功（`✓ built in 1m 40s`，`dist/index.html` 及资源文件生成）
- 复测（ungate 修复后）：`tsc --noEmit` 通过、`pnpm --filter ai-bot build` 成功，仅余既有 chunk 体积等无关告警
- 构建中出现的 antd "use client" 警告、动态/静态混合导入提示与 chunk 体积警告均为既有问题，与本改动无关
- 编辑后文件仅剩既有「已声明但未读取」告警（dayjs / flushSync / fetchDimension 等），本次未新增告警

### 失败和修复过程

- 第一版（gated 方案）失败：将 `extractKnowledgeThoughts` 与 `[DONE]` 的 `isKnowledgeThoughts` 判定都门控在 `currentDeepThinkEnabled` 为真时才执行。用户实测反馈「还是啥也没有」，改动零效果。
- 根因定位：直接读取用户提供的原始 SSE 样例，确认 `messageRef` 累积为**无任何前缀**的纯 JSON（`{\n    "thoughts": "用户想要...`），且全程 `reasoning_content` 为 null。提取正则本身能命中，说明失败点不在提取，而在门控——用户实测时 `deepThinkEnabled` 为 false（默认值，模型支持关闭思考且未手动点亮），导致门控分支从未执行（正解释「零效果」）。
- 修复：移除 `extractKnowledgeThoughts` / `isKnowledgeThoughts` 的 `currentDeepThinkEnabled` 门控，改为始终提取。这样无论深度思考开关状态如何，`chat_with_knowledge` 的 thoughts 都能流式进入思考卡片。

## 回归检查

- `chat_with_db_execute`（`##` 标记）：不匹配 `extractKnowledgeThoughts` 起始正则，走原 `<think>` 提取分支，行为不变
- 归因分析（`reasoning_content` 逐字）：content 非 thoughts 首字段 JSON，不受影响
- `illegal_query` 兜底：分支在 `displayMessage` 提取之前 return，不受影响
- 关闭深度思考：`chat_with_knowledge` 的 thoughts 仍会提取展示（该字段是结构化数据、始终下发，与 `reasoning_content` 门控模式语义不同）；其他模式（`chat_with_db_execute` / 归因）仍受 `currentDeepThinkEnabled` 门控，行为不变
- 答案区：未改动 `extractTrailingJson` 与 view 生成逻辑，data_knowledge 展示不受影响
- 思考开关状态在 `getAnswer` 开始时固定（`currentDeepThinkEnabled`），流式中切换开关不改变本轮渲染

## Review 结果

- 修改集中在 SSE 解析层，未扩散到 UI 组件
- 新增逻辑通过「首字段是否为 thoughts」精确判定场景，避免误伤其他模式
- 未覆盖 `{ "thoughts": "` 起始片段被拆分到多个 chunk 的极端场景（当前样例中起始标记完整出现在单个 chunk）

## 发现的问题

- 结尾 chunk 为 `生成*"\n}`，thoughts 值早已闭合，`extractKnowledgeThoughts` 在遇到第一个未转义 `"` 时即停止，不受尾部 JSON 字段影响

## 本轮经验

- 后端新增流式场景时，优先在 controller/解析层按「内容结构特征」分支适配，不改动下游渲染组件，可最小化影响范围
- 对多种并存的思考传输格式（reasoning_content 逐字 / content 内联 Markdown 标记 / content 首字段 JSON），应以互斥的结构特征显式分流，避免相互覆盖

## 是否需要更新 AI 系统

### 需要更新的 context

- 无需更新，本次为一次性后端新场景适配

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

- 与后端确认 `chat_with_knowledge` 是否稳定以「thoughts 为首字段的 JSON」下发；若结构稳定，可考虑将字段名与识别规则提取为常量或共享类型
- 若后续出现思考起始标记跨 chunk 拆分，需要在解析层补充跨 chunk 缓冲

## 未解决问题

- 未增加自动化测试覆盖 SSE 解析逻辑，后续如该逻辑继续演进，建议补充 characterization tests
