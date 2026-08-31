# RUN_LOG：应用工坊助手卡片点击创建助手会话（绑定资源限定）

- 日期：2026-08-28
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 「2026-08-28 追加：应用工坊助手卡片点击创建助手会话（绑定资源限定）」
- 需求口径（用户确认）：点击卡片 → 立即创建一个绑定该助手的新会话并进入对话，交互/探索/报告三种模式正常可用；该会话输入框的数据语义、技能、MCP 只能从助手绑定资源里拿。明确不采用「跳转 /chat/task/new?assistantId」的 search 方案（该错误实现已于同日全量回滚）。

## 目标

- 「我的助手」卡片整体可点击：调 `session/add` 创建 `appId=<助手ID>` 的新会话（标题用助手名），成功后进入 `/chat/task/<chat_id>`；「查看/分享」按钮阻止冒泡保持原行为；每次点击均创建新会话。
- 打开 `appId≠0` 会话时调 `app/get` 加载助手详情映射为绑定资源，输入框数据语义/技能/MCP 弹窗仅展示绑定候选，不请求全局收藏技能列表与 MCP 分组。
- 助手会话要进入历史会话列表（侧栏可见），会话记录携带绑定助手 ID；`session/list` 按 appId 精确过滤，前端按助手逐个查询去重合并；直链打开且列表未命中时由 `session/get` 兜底恢复会话对象（含 `appId`）触发同样限制。
- 切换绑定助手时清空已选数据语义/技能/MCP。

## 非目标

- 不新增带 `assistantId` 的 search 路由参数，不改 `$taskId` 路由定义。
- 不改 `$taskId` 路由定义；不修改查看抽屉、分享弹窗、分享页 widget、大屏；保持大屏 `appId=1` 隔离不被混入。
- 不用 `chatModelId` 强制覆盖对话页模型；不实现开场白/推荐问题。

## 变更清单

| 文件 | 变更 |
| --- | --- |
| `apps/chat/src/pages/chat/workshop/assistantResources.ts` | 新增：助手详情 → 绑定资源映射（语义 `versions[].schemaSemantics[].schemaConfig`；技能 `skills[].skillConfig`，id 即源版本 id；MCP `tools[]` 中 `toolType='2'`，按 `mcp_sse` 推导协议）；`buildBoundSemanticTree` 输出扁平 schema 叶子树（助手上下文无真实分组 id，避免误发分组 id） |
| `apps/chat/src/pages/chat/workshop/assistantResources.test.ts` | 新增：8 条测试（空 versions 回退、null detail、latestVersionId 选版本、缺字段跳过、toolType 过滤与协议推导、扁平树、接口失败降级） |
| `apps/chat/src/pages/chat/workshop/index.tsx` | 卡片根节点 `onClick` → `createApp({space_id, appId, title: 助手名})` → 进入 `TASK_DETAIL_ROUTE`；创建中防重点；「查看/分享」`stopPropagation` |
| `apps/chat/src/service/api/app.ts` | `mapAppListParams` 支持显式 `appId`（默认仍 0）；请求去重改为按 appId 键控；新增 `fetchAssistantSessionList`：先查助手列表，再按助手并行 `session/list` 查询并合并，供会话列表展示历史助手会话 |
| `apps/chat/src/components/conversation-analysis/index.tsx` | 按 `curConv.appId` 加载绑定资源（`appId=0` 不请求）；`getAppList` 将普通会话与助手会话按 `chat_id` 去重合并后排序写入列表与缓存；`session/get` 兜底恢复列表未命中的会话；绑定候选以 `useMemo` 稳定引用传给 ChatInput；`assistantId` 变化清空已选语义；`semLoading` 合并绑定资源加载态 |
| `apps/chat/src/components/conversation/components/chat-input/index.tsx` | 新增 `assistantSemanticTree/assistantSkills/assistantMcps` 三个限定 prop：数据语义弹窗改用绑定叶子树；技能候选改用绑定列表并跳过 `favorite/list`；MCP 弹窗改绑定服务扁平列表并跳过全局分组请求；报告源字段映射（`buildReportSourceVersionFields`）对绑定候选直接可用；切换绑定时清空已选技能/MCP |
| `apps/chat/src/index.css` | 新增 `.ws-assistant-card--clickable { cursor: pointer }` |
| `.ai/requirements/CURRENT_REQUIREMENT.md` | 补录本需求章节（背景/目标/非目标/影响范围/验收） |

## 验证结果

| 项 | 结果 |
| --- | --- |
| `pnpm vitest run src/pages/chat/workshop/assistantResources.test.ts` | 8/8 通过 |
| `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json` | 通过 |
| `pnpm --filter ai-bot build` | 成功（4m58s，chunk 体积警告为既有） |
| `git diff --check` | 无空白错误 |

## 已知限制与待观察

- 运行时链路（点击卡片 → 建会话 → 限制弹窗 → 列表展示）未经浏览器实际验证，依赖后端 `session/add` 返回 `chat_id`、`session/get` 返回 `appId`、`session/list` 支持按助手 appId 查询，需联调确认。
- 助手会话列表合并为前端按助手逐个查询（N+1，助手数量级小可接受）；若后端后续支持一次查询「普通+助手会话」，可简化 `fetchAssistantSessionList`。
- 绑定语义弹窗为扁平叶子列表（按名称展示），不展示分组层级——助手上下文无真实分组 id，选分组会发送无效 `semanticGroupId`，故只允许选叶子。
- `assistantResources.ts` 位于 `pages/chat/workshop/` 下，TanStack Router 会输出「does not export a Route」警告（与既有 `AssistantDetailDrawer.tsx` 相同，不影响路由树与构建）。
- 工作区另有并行会话的未提交改动（chat-widget、exploration-mode、skill、$shareCode、dashboard BaseApi 等），本次未触碰。

## 后续是否需要更新

- `.ai/context/`、`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：无需更新。
