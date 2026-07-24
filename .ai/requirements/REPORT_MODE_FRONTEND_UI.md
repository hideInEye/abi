# 报告模式前端 UI 与状态处理任务文档

## 文档状态

- 状态：新协议前端基础实现已完成；一 task 一 Stream 与尾部序号协议已确认，等待真实报告服务联调。
- 日期：2026-07-22。
- 范围：`apps/chat` 报告模式前端、IndexedDB 任务记录、Node 原始 Redis Stream 接入。
- 当前阶段：任务提交、IndexedDB 定位记录、Redis 原始事件 reducer、报告模式 UI 与双栏预览已实现；真实端到端联调尚未完成。

本文件是 `.ai/requirements/CURRENT_REQUIREMENT.md` 的前端实施规格。当前工作区的目标实现已移除入口 SSE、`stream.ready`、Snapshot、Structure、旧任务状态和 `report.completed` 等旧假设；真实协议保证每个 task 拥有独立 Stream，Stream key 尾部数字段表示同会话问题顺序。

## 产品目标

- 普通对话保持原有页面、接口、消息组件和控制器，不做重构。
- 报告模式继续使用当前会话页面外壳，但发送和回答状态完全独立。
- 报告模式发送后，右侧显示用户问题，左侧显示报告回答。
- 报告回答由“思考执行记录 / ToDo 执行流 / 报告文件”组成。
- 报告生成事件从 Redis Stream 原样回放，由前端 Hook 聚合为 UI 状态。
- 没有报告历史接口时，使用 IndexedDB 保存任务定位信息，并通过 Redis 完整回放恢复问答。
- HTML 或 Markdown 候选出现后立即打开右侧报告，形成左右双栏。

## 非目标

- 不修改普通对话消息布局、发送接口和历史逻辑。
- 不接入分歧判断或补充问答。
- 不使用入口 SSE 或 `stream.ready`。
- 不调用 `{baseApi}/chat-proxy/api/v1/chat/report/task`。
- 不调用 Node Snapshot 或 Structure 接口。
- 不从数据库获取步骤结构化数据。
- 不要求步骤完成后才能展开。
- 不在 IndexedDB 缓存 Redis 事件、ToDo 状态或报告正文。
- 不实现报告编辑、导出、分享、报告列表和独立详情页。
- 不展示内部思维链、完整工具参数、系统提示词或敏感调试内容。

## 页面入口与模式隔离

### 普通对话

普通对话继续使用现有链路：

```text
Conversation
  -> MessageList
  -> useConversationController
  -> 普通对话接口
```

报告功能不得把 Redis、IndexedDB 或报告任务状态写入普通对话控制器。

### 报告模式

用户在输入框中选择“报告”后，发送事件交给独立报告模式容器：

```text
ReportConversation
  -> useReportConversation
  -> POST {baseApi}/chat-proxy/api/v1/chat/report
  -> IndexedDB ReportTaskRecord
  -> Node raw Redis SSE
  -> frontend event reducer
```

如果当前页面还没有有效的 `convUid/sessionId`，继续使用现有会话创建流程创建会话；取得 `/api/abi-chat/v1/app/session/list` 可返回的会话身份后再提交报告，不能用临时路由值代替 `conv_id`。

## 报告提交任务

### 请求接口

```http
POST {baseApi}/chat-proxy/api/v1/chat/report
Content-Type: application/json
```

```ts
interface SubmitReportRequest {
  messages: string
  app_id: number
  space_id: number
  group_id: string
  conv_id: string
  session_id: string
  user_id: number
  embed_model_id?: number
  chat_model_id: number
  app_type?: string
}
```

参数映射：

| 报告接口字段 | 前端来源 |
| --- | --- |
| `messages` | 当前用户问题 |
| `conv_id` | 当前会话 `convUid` / 兼容映射后的 `conv_uid` |
| `session_id` | 当前会话 `sessionId` / 兼容映射后的 `chat_id` |
| `space_id` | 当前空间 |
| `app_id` | 当前会话或应用 `appId` |
| `user_id` | 当前登录用户信息 |
| `chat_model_id` | 当前选择模型 ID |
| `embed_model_id` | 当前嵌入模型 ID，有效时传递 |
| `group_id` | 当前会话的 `groupId`；新会话使用 `/api/abi-chat/v1/app/session/group/list` 返回并由路由带入的字符串，保持原类型；无分组时传空字符串 |
| `app_type` | 当前应用类型，有效时传递 |

请求是普通 HTTP 异步提交，不读取 SSE，不等待报告生成完成。

### 成功响应与前端标准化

```ts
interface SubmitReportResponse {
  message: string
  data: {
    conv_id: string
    task_id: string
    status: string
    stream_key: string | null
  }
}

interface SubmittedReportTask {
  conversationId: string
  taskId: string
  streamKey: string
  status: string
}
```

标准化规则：

- `data.conv_id -> conversationId`
- `data.task_id -> taskId`
- `data.stream_key -> streamKey`
- HTTP 202 且三个定位字段有效才算提交成功。
- 成功后先写 IndexedDB，再开始连接 Redis。
- 失败或 `stream_key` 为空时，将当前报告消息标为提交失败并展示后端可读错误。

## IndexedDB 任务记录

### 数据结构

```ts
interface ReportTaskRecord {
  conversationId: string
  sessionId: string
  taskId: string
  question: string
  streamKey: string
  sortOrder: number
  createdAt: number
}
```

### Object Store 约定

- 使用独立的报告模式数据库或现有聊天本地数据库中的独立 Object Store。
- Object Store 使用 `[conversationId, taskId]` 复合主键。
- `sortOrder` 从 `streamKey` 的最后一个数字段解析，例如 `report:bdbd546c-29c0-11f1-a433-0242c0a87002:1/2/3`。
- 建立 `[conversationId, createdAt]` 复合索引用于过滤会话记录，取回后按 `sortOrder -> createdAt -> taskId` 稳定排序。
- 读取没有 `sortOrder` 的旧缓存时，从 `streamKey` 自动补齐，避免升级过程导致历史任务丢失。
- 写入使用 `put` 语义，保证相同任务幂等。
- 不引入新的第三方 IndexedDB 依赖，优先使用浏览器原生 API 和领域内 Promise 封装。

### 保存边界

只保存：

- 会话 ID。
- Session ID。
- 报告 task ID。
- 用户问题。
- Redis Stream key。
- 当前会话内问题顺序 `sortOrder`。
- 创建时间。

不保存：

- Redis entry 或解析后的事件。
- `lastId`。
- 思考、ToDo、step、final 状态。
- HTML 或 Markdown 正文。
- 报告打开状态和用户滚动位置。

### 页面恢复

1. 会话选中后，以 `convUid` 查询该会话全部记录。
2. 按 Stream 尾部序号对应的 `sortOrder` 升序创建报告消息列表；异常重复序号再以 `createdAt/taskId` 决定稳定次序。
3. 每个任务分别从 `streamKey + 0-0` 回放。
4. 已完成任务读取到 `done` 后停止；运行中任务在历史回放后继续等待新 entry。
5. 切换会话时中止旧会话的全部 AbortController，再加载新会话任务。
6. 同页断线使用内存中的 `lastId` 续读；整页刷新重新从头回放。
7. 重放结果只存在当前 React 状态中，不反写 IndexedDB。

IndexedDB 不可用或写入失败时，当前任务仍可在内存中运行，但需要展示“刷新后可能无法恢复”的非阻断提示。

## Node 原始事件接口

前端只调用：

```text
GET /api/report-stream/events?stream_key={streamKey}&last_id={lastId}
```

约定：

- 首次和整页恢复时 `last_id=0-0` 或省略。
- 同页重连时使用最后成功处理的 Redis entry ID。
- SSE `id` 是 Redis entry ID。
- SSE `data` 是 Redis entry `data` 字段中的原始 JSON 字符串。
- 不依赖 SSE `event` 名称判断业务类型，前端从 `data.type` 读取。
- Node 发送 heartbeat 时不产生业务状态。
- 收到 `done` 后由前端主动 Abort。

前端不再调用：

```text
GET /api/report-stream/snapshot
GET /api/report-stream/structure
```

## 前端状态模型

```ts
type ReportConversationStatus =
  | 'submitting'
  | 'waiting_stream'
  | 'thinking'
  | 'running'
  | 'completed'
  | 'failed'

type ReportPlanTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

type ReportFormat = 'html' | 'markdown'

interface ReportArtifactCandidate {
  entryId: string
  stepId: string
  format: ReportFormat
  content: string
}

interface ReportTaskRuntime {
  record: ReportTaskRecord
  status: ReportConversationStatus
  lastId?: string
  seenEntryIds: Set<string>
  thinkingOpen: boolean
  todoOpen: boolean
  thinkingSteps: ReportExecutionStep[]
  plan?: ReportPlanSnapshot
  planHistory: ReportPlanSnapshot[]
  unassignedSteps: ReportExecutionStep[]
  finalText?: string
  reportCandidate?: ReportArtifactCandidate
  error?: string
}
```

`Set` 等不可序列化对象只存在 Hook 内存状态中，不进入 IndexedDB。

## Redis 事件 reducer

### 通用处理顺序

1. 读取 SSE `id` 和原始 `data`。
2. 校验 ID 是否满足 `{milliseconds}-{sequence}` 格式。
3. 对比 ID 的两个数值部分，按 Redis 顺序处理。
4. 已存在于 `seenEntryIds` 的 entry 直接忽略。
5. JSON 解析失败、缺少 `type` 或字段异常时记录可恢复错误并跳过。
6. 成功处理后更新 `lastId`。

不能用字符串到达时间、数组渲染顺序或事件中的 `step` 字段代替 Redis entry ID。

### `question`

- 校验 Redis 中的问题与 IndexedDB `question` 是否一致。
- 页面展示以 IndexedDB 中提交时保存的问题为主。
- 不一致时保留 Redis 内容用于诊断，但不生成第二条用户消息。

### `step.start / step.meta / step.chunk / step.done`

- 使用业务字段 `id` 合并同一执行步骤。
- 同一 `id` 可能先有正整数 `step` 的“思考中”，后有 `step: 0` 的真实工具步骤；两者必须合并，不能渲染成两个独立步骤。
- 实际工具标题、detail、action 等字段到达后覆盖占位标题。
- `step.done` 更新该执行步骤状态，但不直接决定所属 ToDo 完成。
- `step.chunk` 按 Redis ID 追加，输出类型支持 `text/markdown/code/image/html`。

公开展示白名单：

- `title`
- `detail`
- `action`
- `action_intention`
- 整理后的 `step.chunk` 输出

不直接展示：

- `thought`
- `action_reason`
- 完整 `action_input`
- 系统提示词、认证信息、内部路径和异常堆栈

### 第一条 `plan.update` 之前

- `question` 后、第一条 `plan.update` 前的全部 step 归入顶部思考执行记录。
- 思考区默认展开并实时追加记录。
- “思考中”占位步骤可以显示简短动态状态，实际工具信息到达后就地更新。
- 第一条 plan 到达时，思考区自动收起。

### `plan.update`

- `tasks` 是当前完整计划快照，不做局部 patch。
- 保存 `source/version/entryId`，用于调试顺序和保留重规划历史。
- 首条 plan 到达时自动展开 ToDo。
- 当前状态支持 `pending/in_progress/completed/cancelled`。
- 完成数量只统计 `completed`。
- `cancelled` 显示为已取消，不改写为 completed。

### 执行步骤归属 ToDo

当前协议没有 `todo_id`、`todo_index` 或其他直接关联字段，按已确认时序处理：

- 某条 plan 到下一条 plan 之间的 step 归入该 plan 当时的 `in_progress` 任务。
- 使用 plan 中任务的数组位置作为该快照内显示位置，不把 step 的 `step` 值当作 ToDo 下标。
- 下一条 plan 到达后，先结束上一时间段，再建立新的执行时间段。
- 计划发生重写时保留旧时间段及其执行记录，不把历史步骤强行移动到新任务。
- 当前快照没有唯一 `in_progress` 项时，将步骤放入“未归属执行记录”，不得自行猜测。

### `final`

- 保存为报告任务的最终文字摘要。
- 可以展示在 ToDo 之后、报告文件之前。
- 不作为报告文件，不触发完成，也不关闭连接。

### HTML / Markdown 候选

- 任意 `step.chunk.output_type === 'html'` 或 `'markdown'` 都立即成为报告候选。
- 即使该 Markdown 出现在第一条 plan 之前，也立即触发右侧报告展示。
- 新候选的 Redis ID 晚于当前候选时，覆盖右侧内容。
- HTML 与 Markdown 之间同样采用“最后一个候选获胜”。
- 候选产生时不把整体任务标记为完成，仍继续处理后续事件。

### `done`

- `done` 表示整个 Redis 事件流结束。
- 存在报告候选：状态设为 `completed`，最后候选固定为最终报告文件，前端中止 SSE。
- 不存在报告候选：状态设为 `failed`，错误文案为“未收到报告文件”，保留已产生的思考、ToDo 和 final。
- 最后 plan 若为 `source=terminate` 且任务状态为 `cancelled`，仍原样显示任务状态；整体成功由“存在报告候选 + done”决定。

## UI 结构

### 报告模式消息

```text
报告模式会话
  ├─ 右侧：用户问题
  └─ 左侧：报告回答
       ├─ 思考执行记录
       ├─ ToDo 执行流
       ├─ final 文字摘要（如果存在）
       └─ 报告文件卡（done 且有报告候选）
```

同一会话内每个 IndexedDB task 对应一组独立的用户问题和报告回答，不能把多个 task 的事件合并到同一 ToDo。

### 思考执行记录

- 默认展开。
- 顶部显示“正在思考”或已完成摘要。
- 按 Redis 顺序展示公开工具/Skill 执行记录。
- 第一条 plan 到达后自动收起，用户可手动重新打开。
- 报告候选可能在思考阶段出现；此时仍按确认规则打开右侧报告。

### ToDo 执行流

- 第一条 plan 到达后自动展开。
- Header 展示当前状态和 `completed / total`。
- 当前 `in_progress` 项突出显示并默认展示实时执行步骤。
- pending、completed、cancelled 项均可手动展开查看已经产生的步骤。
- 用户不能编辑、勾选、拖拽或排序。
- 不显示“点击查看结构化数据”，不请求后端 Structure。
- 执行步骤按 output type 渲染：
  - text：普通文本。
  - markdown：只读 Markdown，同时更新报告候选。
  - code：只读代码块。
  - image：图片预览，加载失败显示原地址和错误状态。
  - html：不在任务行直接执行，更新右侧 sandbox 报告候选。

### 报告文件卡

- 只在收到 `done` 且存在报告候选后显示。
- 显示从最终候选得到的 HTML/Markdown 格式。
- 标题优先使用 HTML `<title>` 或 Markdown 首个一级标题，解析失败时使用“报告文件”。
- 点击后打开或切换到最终报告内容。
- 报告文件卡是当前对话内入口，不新增独立路由。

## 左右双栏报告

桌面端：

```text
┌────────────────────────────┬────────────────────────────┐
│ 左侧：报告模式对话          │ 右侧：最新报告候选          │
│ 用户问题 / 思考 / ToDo      │ Header / 格式 / 只读内容    │
│ final / 报告文件 / 输入框   │ 关闭按钮                    │
└────────────────────────────┴────────────────────────────┘
```

行为：

- 首个 HTML/Markdown 候选到达时自动打开右栏。
- 后续候选更新右栏，不创建多个预览面板。
- 左侧保留对话滚动位置和输入框。
- 关闭右栏恢复单栏，不停止报告生成。
- `done` 后点击报告文件卡可以重新打开右栏。
- 多个报告 task 完成时，点击各自文件卡切换 active task。
- 报告右栏与系统其他右侧面板互斥。

窄屏：

- 不强制并排。
- 使用“对话 / 报告”切换。
- 报告候选出现时切换到报告视图。
- 返回对话后保持任务状态，继续接收事件。

## 报告渲染与安全

### Markdown

- 使用项目现有只读 Markdown 能力。
- 支持标题、段落、列表、表格和代码块。
- 禁止将 Markdown 中的原始 HTML 作为宿主 DOM 执行。
- 外部链接使用安全的新窗口属性。

### HTML

- 使用 `iframe srcDoc`。
- iframe sandbox 不包含 `allow-same-origin`。
- 禁止控制顶层页面、弹窗和表单提交。
- 不允许访问宿主 Cookie、localStorage、sessionStorage。
- 如果报告确需脚本，只开放最小 `allow-scripts`，仍不能开放同源权限。
- 后端负责把图片、字体、样式等资源改为绝对 URL。
- 前端不为 `/images/*` 猜测服务地址，也不由 Node 增加资源代理。

## 建议模块边界

后续实施继续放在报告模式领域目录，普通对话控制器不承担报告状态：

```text
apps/chat/src/components/conversation/report-mode/
  components/
  hooks/
  storage/
  reducers/
  types/
```

职责建议：

- `ReportConversation`：报告模式容器和多 task 消息列表。
- `ReportMessageRow`：右侧问题与左侧回答布局。
- `ReportThinkingPanel`：首个 plan 前的公开执行记录。
- `ReportTodoList`：计划快照和按时间段归属的执行步骤。
- `ReportFileCard`：最终候选入口。
- `ReportPreviewPane`：桌面双栏和移动端报告视图。
- `useReportConversation`：会话级任务装载、发送、切换和连接生命周期。
- `useReportStream`：单 task 原始 SSE、重连和 Abort 生命周期。
- `reportEventReducer`：纯函数事件排序、去重、step 合并、plan 分段和终态。
- `reportTaskStorage`：原生 IndexedDB Promise 封装。
- `reportApi`：POST 报告任务与 Node raw events 请求。

实际开发可以基于现有报告模式目录小步调整，不要求为了匹配目录示例大范围移动文件。

## 异常与边界行为

- 报告提交失败：保留用户问题，左侧显示提交失败，不写 IndexedDB。
- IndexedDB 写入失败：继续当前生成，但提示刷新不可恢复。
- Redis Stream 暂不存在：SSE 保持等待并显示“等待任务开始”。
- SSE 断线：使用当前内存 `lastId` 重连，重复 entry 去重。
- 整页刷新：从 `0-0` 回放，不信任旧内存状态。
- 坏 JSON/未知事件：跳过单条并记录可恢复错误，不结束整个报告。
- plan 没有唯一 in_progress：步骤进入未归属区域。
- `done` 无报告候选：整体失败，但保留已有执行过程。
- 多 task：各自维护 `lastId/seenEntryIds/controller`，一个任务失败不能中断其他任务。
- 后端 Redis 历史被裁剪：提示历史不完整；前端不使用本地旧状态伪造缺失内容。

## 后续开发验收标准

- 普通对话功能、样式和接口不受影响。
- 报告模式使用普通 POST 提交接口，不再使用入口 SSE。
- 请求参数正确使用会话列表的 `convUid/sessionId`。
- `taskId/question/streamKey` 等完整记录写入 IndexedDB。
- 同一会话多 task 可以在刷新和切换后恢复。
- Node 原始 SSE 从 `stream_key + last_id` 读取，不依赖 Snapshot 和 Structure。
- Redis entry 按 ID 去重排序，同 step ID 正确合并。
- 第一条 plan 前展示思考，第一条 plan 到达后思考收起、ToDo 展开。
- plan 更新覆盖任务状态，执行记录按 plan 时间段归属。
- 执行中 ToDo 可以查看实时步骤，不再受完成状态限制。
- 任意 HTML/Markdown chunk 立即触发右侧报告并按最新候选更新。
- `done` 有候选时生成报告文件卡，无候选时显示失败。
- HTML sandbox 和 Markdown 安全规则生效。
- 桌面双栏与移动端切换均保持左侧对话状态。

## 后续测试任务

### 纯函数与存储

- Redis ID 比较、排序和重复 ID 去重。
- step.start/meta/chunk/done 按 ID 合并。
- 首个 plan 前后状态切换。
- plan 快照覆盖与 completed 计数。
- plan 时间段步骤归属和未归属 fallback。
- HTML/Markdown 候选覆盖。
- done 有报告与无报告两个分支。
- IndexedDB put、复合主键、按会话读取、多 task 排序和失败降级。

### 接口与生命周期

- 报告 POST 请求参数和 202 响应映射。
- stream_key 为空和提交失败。
- 首次 `0-0` 回放。
- 同页断线 lastId 续读。
- 整页刷新完整回放。
- 会话切换 Abort 与新会话恢复。
- 多 task 并行连接互不影响。
- done 后前端主动关闭连接。

### UI 与安全

- 思考自动收起与手动展开。
- ToDo 自动展开和实时步骤渲染。
- pending/in_progress/completed/cancelled 展示。
- HTML/Markdown 自动打开和候选切换。
- 报告文件卡打开、关闭和 task 切换。
- HTML iframe sandbox。
- Markdown 原始 HTML 与外链安全。
- 窄屏“对话 / 报告”切换。
- 普通对话完整回归。

## 已确认前提与风险

- Redis Stream 是报告历史恢复的唯一内容来源，后端需要保证足够的保留周期和长度。
- 报告任务状态查询接口当前不使用；如果未来 Redis 不再提供可靠终态，需要重新评审，不能前端自行轮询。
- HTML 中资源将由后端改为绝对 URL，这是 HTML 报告正确显示的前置条件。
- 当前没有 ToDo 关联 ID，按 Redis plan 分段是一项明确的 V1 约定；未来后端增加稳定 `todo_id` 后应优先使用显式关联。
- 任意 pre-plan Markdown 也会触发报告预览，这是已确认行为，后续若影响 Skill 说明展示需要单独修改协议。
- 每个 IndexedDB task 必须对应边界清晰的 Redis 事件序列。2026-07-22 的 DB3 实际数据中，同一 Stream 在一条 `done` 后又追加了新的 `question`；如果后端会复用 Stream，需增加 `task_id` 或其他稳定边界字段，不能由前端依赖问题文本猜测归属。
