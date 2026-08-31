# 2026-08-31 助手会话延后创建 + 欢迎页接口调用治理

## 任务来源

用户反馈（带两张网络面板截图）：
1. 点击助手卡片进入「新欢迎页」一次性触发大量接口且多重复（add/list/get/get/query/get/list×6）。
2. 普通欢迎页同样一次涌入 8 个 `list`。
3. 要求：点卡片先不新建会话，发起对话后再创建；确认会话逻辑与之前一致、仅顺序延后。

## 根因定位

- `workshop/index.tsx handleEnterAssistantChat`：点卡片立即 `createApp`（add），进入后还触发 `session/get` 兜底与空历史 `message/query`。
- `conversation-analysis/index.tsx getAppList` → `service/api/app.ts fetchAssistantSessionList`：先 `app/list` 取助手列表，再**逐助手** `session/list`（N 次）。普通欢迎页 8 个 list = 1×session/list(appId=0) + 1×app/list + 6×逐助手 session/list。
- 该合并列表在对话路由（hideSidebar）下无消费方：ConverList 不渲染；路由恢复已有 `session/get` 兜底 effect 覆盖。

## 变更

1. `apps/chat/src/pages/chat/workshop/index.tsx`
   - `handleEnterAssistantChat` 移除 `createApp`/`creatingAssistantId`/`message`，改为
     `navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: 'new' }, search: { appId: agent.id } })`。
2. `apps/chat/src/pages/chat/task/$taskId.tsx`
   - 路由 `validateSearch` 声明可选 `appId`（返回类型 `{ appId?: string }`，避免被推断为必填 search）；
     `Route.useSearch()` 读取后以 `pendingAssistantId` 透传 ConversationAnalysis。
3. `apps/chat/src/components/conversation-analysis/index.tsx`
   - 新增 prop `pendingAssistantId`；`assistantId = curConv ? String(curConv.appId ?? 0) : (pendingAssistantId || '0')`，
     待命助手复用既有绑定资源加载/欢迎页/默认选中第一个逻辑。
   - 新增 `pendingAssistantCreate` memo（`{ appId, title: 助手名 }`，仅 curConv 为空且 assistantId≠0 时）。
   - `createNewConv(options?)`：`createApp({ space_id, appId, title })`，newApp 补 `appId` 回退；
     `ensureConv` 与 `handleUnifiedSend` 无会话分支均传 `pendingAssistantCreate` —— 与之前立即创建载荷一致，仅时机延后。
   - `getAppList`：`hideSidebar` 时跳过 `fetchAssistantSessionList`（deps 补 hideSidebar）。
   - 欢迎页渲染分支：`assistantWelcome ?? (assistantId !== '0' ? null : <NewChatWelcome/>)`，
     绑定资源加载期间空置避免默认欢迎页闪烁。
   - 创建后 `createNewConv` navigate 不带 search → 路由 appId 清空，curConv.appId 接管，assistantId 值不变
     → 绑定资源不重拉、已选语义不被清空 effect 误清。
4. `apps/chat/src/service/api/app.ts`
   - `fetchAssistantSessionList` 加 60s TTL 模块级缓存（`options.force` 可绕过），重挂载/静默刷新复用同一 promise。

## 接口变化对照（进入助手欢迎页）

| 之前 | 之后 |
| --- | --- |
| session/add（立即建会话） | 无（延后到首次发送/上传） |
| session/get 兜底 | 无（routeChatId='new' 不触发） |
| message/query 空历史 | 无（Conversation 不挂载） |
| app/list + N×session/list 合并 | 无（hideSidebar 跳过） |
| app/get 绑定资源 | 保留（欢迎页文案需要） |
| session/list(appId=0) + group/list | 保留（侧栏需要，与侧栏请求并发去重） |

## 验证

- `npx tsc --noEmit -p tsconfig.app.json`：仅存量 `multi-measure-pie-chart.ts`（.ts 含 JSX）报错，本次修改文件 0 新增。
- 行为等价核对：createApp payload 与之前 workshop 立即创建一致（space_id/appId/title）；创建后 `conversation-created` 事件、justCreatedRef、localStorage chatId 逻辑未变。
- 端到端（251 环境）待用户联调：点卡片应只见 app/get + 常规 list；首条消息发送后出现 session/add 且会话带助手绑定。

## 回归检查

- 普通欢迎页：渲染分支 `assistantId==='0'` 走原 `<NewChatWelcome onExampleClick>`，不变。
- 历史助手会话进入：appList 无合并时由 session/get 兜底恢复（既有逻辑），hideSidebar 场景与之前缓存未命中行为一致。
- 侧栏保留场景（hideSidebar=false）：合并列表行为不变，仅加 60s TTL 缓存。
- 新建对话按钮/侧栏历史跳转：navigate 不带 search → pendingAssistantId=undefined，不影响普通流程。

## 后续资产更新

- `.ai/requirements/CURRENT_REQUIREMENT.md` 追加「2026-08-31 追加二」章节（覆盖上一节「不改变立即创建流程」非目标）。

## 后续减法（用户追问后核实）

用户质疑「为什么加条件不删逻辑」。核实后确认合并查询为死代码，直接删除：

- 事实依据：`ConversationAnalysis` 全仓库唯一使用方 `task/$taskId.tsx` 恒传 `hideSidebar`，合并列表唯一 UI 消费方 ConverList 永不渲染；外层侧栏只查 appId=0 不消费合并结果；路由恢复助手会话由 `session/get` 兜底。
- 删除：`conversation-analysis/index.tsx getAppList` 中 `fetchAssistantSessionList` 调用与 byId 合并块（`sortAppList(normalList)` 直出）；`service/api/app.ts` 整个 `fetchAssistantSessionList` + TTL 缓存。
- 行为等价：普通会话列表不变；助手旧会话按路由打开仍由 session/get 恢复；进入欢迎页再无任何逐助手 list。
- tsc 验证仅存量 multi-measure-pie-chart.ts 报错。
