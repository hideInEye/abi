# 报告模式新链路需求：异步任务提交 + Node 原始 Redis Stream + 前端状态聚合

## 文档状态

- 状态：新协议基础实现已完成；task 与 Stream 边界、DB3 和多问题顺序协议已确认，等待真实报告服务联调。
- 日期：2026-07-22。
- 当前分支：`dev/zanghb-20260720-chatreport`。
- 需求类型：`apps/chat` 报告模式重建 + `server/` Redis Stream 读取边界调整。
- 当前阶段：已完成 Node 原始读流、前端任务提交/恢复/聚合与报告 UI 基础实现；真实报告服务联调尚未完成。

本文件是报告模式开发与后续联调的唯一当前需求依据。当前工作区已经删除目标实现中的“入口 SSE + `stream.ready` + Node Snapshot 聚合 + Structure 接口”旧假设；每个 task 使用独立 Stream，Stream key 最后的 `0/1/2/3...` 数字段表示同一会话内的问题顺序。

普通对话继续沿用现有 `Conversation / MessageList / useConversationController` 链路。报告模式使用独立组件、独立接口和独立状态 Hook，不重构普通对话页面，不改变普通对话接口。

## 背景与已确认链路

当前没有可供报告模式使用的历史问答接口。报告问答的恢复依赖两类数据：

1. 前端通过 IndexedDB 保存报告任务的定位信息。
2. 页面重新进入时，通过 Node.js server 从 Redis Stream 起点回放该任务的全部原始事件。

完整链路如下：

1. 用户从 `/api/abi-chat/v1/app/session/list` 返回的会话列表中进入一个会话。
2. 会话数据中的 `convUid` 作为报告接口的 `conv_id`，`sessionId` 作为 `session_id`。
3. 用户切换到“报告”模式并发送问题。
4. 前端调用普通异步接口 `POST {baseApi}/chat-proxy/api/v1/chat/report`，不调用普通对话接口，也不使用入口 SSE。
5. 报告接口返回 `task_id`、`stream_key`、`conv_id` 等任务定位信息。
6. 前端先将任务定位信息写入 IndexedDB，再携带 `stream_key` 请求 Node.js server。
7. Node.js server 使用 `XREAD + last_id` 读取 Redis Stream，并将每条 entry 的 ID 与 `data` 原样通过 SSE 传给前端。
8. 前端 Hook 根据 Redis entry ID 的顺序解析事件，构建思考、ToDo、执行步骤、报告候选和整体终态。
9. 页面刷新、切换会话、关闭后重新打开时，从 IndexedDB 找到当前会话的任务，再从 Redis Stream `0-0` 完整回放并恢复页面。

## 目标

### 报告任务提交

- 报告模式发送使用 `POST {baseApi}/chat-proxy/api/v1/chat/report`；当前 `baseApi=/api` 时实际地址为 `/api/chat-proxy/api/v1/chat/report`。
- 删除分歧分析、补充问答、入口 SSE、`stream.ready` 等旧设计。
- 使用现有会话、空间、用户、应用和模型信息构造请求。
- 成功响应必须标准化为前端字段并写入 IndexedDB。
- 不调用 `GET {baseApi}/chat-proxy/api/v1/chat/report/task`；报告是否结束由 Redis Stream 回放结果判断。

### Node.js server

- Node.js server 只负责连接 Redis、读取指定 Stream、发送 SSE 和维持连接。
- Node 不解析或聚合报告业务状态，不生成 Snapshot，不生成 Structure，不判断报告成功失败。
- Node 不保存前端历史，不触发报告生成，不调用报告任务接口。
- Redis entry 的 `data` 字符串必须原样传递给前端。

### 前端报告模式

- 普通对话页面、普通对话消息和普通对话接口保持不变。
- 报告模式使用独立状态 Hook 处理完整 Redis 事件流。
- 用户问题显示在右侧，报告回答显示在左侧。
- 左侧回答包含思考、ToDo 执行过程和最终报告文件。
- HTML 或 Markdown 报告候选出现时自动进入左右双栏。
- 同一会话支持多个报告 task，并可在刷新或切回会话时完整恢复。

## 非目标

- 不修改普通对话消息结构或普通对话请求协议。
- 不实现报告分歧问答。
- 不使用报告入口 SSE。
- 不调用报告任务状态查询接口。
- 不让浏览器直连 Redis。
- 不在 Node 中聚合 tasks、steps、report 或 error。
- 不保留 Node Snapshot 接口或 mock Structure 接口作为目标能力。
- 不从数据库请求步骤结构化数据。
- 不在 IndexedDB 保存 Redis 原始事件、ToDo 状态、HTML、Markdown 或 `lastId`。
- 不建设报告编辑、导出、分享、报告列表或独立详情路由。
- 不展示模型内部思维链、完整工具输入或敏感调试数据。

## 报告任务提交接口

### 请求

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

字段来源：

- `messages`：用户当前发送的问题。
- `conv_id`：会话列表返回的 `convUid`。
- `session_id`：会话列表返回的 `sessionId`。
- `space_id`：当前空间 ID。
- `app_id`：当前会话或应用 ID。
- `user_id`：当前登录用户 ID。
- `chat_model_id`：当前选择的对话模型 ID。
- `group_id`：优先取当前会话绑定的 `groupId`；新会话场景使用 `/api/abi-chat/v1/app/session/group/list` 返回并经路由传入的 `groupId`。该字段保持字符串类型原样传递，没有分组时显式传空字符串。
- `embed_model_id`、`app_type`：存在有效业务值时传递。

报告模式不得为了发送问题调用旧普通对话回答接口。新建会话仍沿用现有会话创建与 `/api/abi-chat/v1/app/session/list` 刷新链路，取得 `convUid/sessionId` 后才能提交报告任务。

### 成功响应

接口成功返回 HTTP `202 Accepted`：

```json
{
  "message": "报告生成任务已提交",
  "data": {
    "conv_id": "bdbd546c-29c0-11f1-a433-0242c0a87002",
    "task_id": "d60db07d-5bc8-4c44-80d2-a2f864bc3250",
    "status": "queued",
    "stream_key": "report:bdbd546c-29c0-11f1-a433-0242c0a87002:1"
  }
}
```

前端标准化映射：

```text
data.task_id   -> taskId
data.stream_key -> streamKey
data.conv_id   -> conversationId
```

只有 `taskId`、`streamKey`、`conversationId` 均有效时，任务才进入持久化和 Redis 读取阶段。提交失败、业务异常或 `stream_key` 为空时，在当前报告回答卡片中展示失败，不创建可恢复的 IndexedDB 记录。

## IndexedDB 数据约定

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

存储规则：

- 使用 `[conversationId, taskId]` 作为复合主键。
- `sortOrder` 从 `streamKey` 最后一个数字段解析，例如 `report:bdbd546c-29c0-11f1-a433-0242c0a87002:2 -> 2`。
- 建立 `conversationId + createdAt` 索引用于会话过滤；查询后以 `sortOrder` 为主、`createdAt/taskId` 为兜底进行稳定排序。
- 已存在且没有 `sortOrder` 的旧缓存记录，在读取时从 `streamKey` 补齐，不要求清空 IndexedDB。
- `conversationId` 使用 `convUid`，不使用页面路由中的临时字符串代替。
- 提交成功后先完成 IndexedDB 写入，再开始 Redis Stream 连接。
- 重复写入同一个复合主键时使用幂等更新，不生成重复报告卡片。
- IndexedDB 只保存任务定位信息；页面状态每次由 Redis 完整回放重建。
- IndexedDB 写入失败时允许当前页面继续读取 Redis，但必须提示该任务无法保证刷新恢复。

恢复规则：

1. 进入会话后按 `conversationId` 查询全部 `ReportTaskRecord`。
2. 按 `sortOrder` 升序恢复；只有序号异常或重复时才使用 `createdAt/taskId` 保证稳定顺序。
3. 每个 task 使用其 `streamKey` 从 `0-0` 开始回放。
4. 收到 `done` 的 task 完成恢复并主动关闭连接；未收到 `done` 的 task 保持实时等待。
5. 切换会话时中止旧会话全部连接并加载新会话记录。
6. 同一页面发生网络中断时，使用内存中的最后 Redis ID 续读；整页刷新后不依赖旧 `lastId`，重新从 `0-0` 回放。

## Node.js server 接口与边界

目标接口仅包括：

```text
GET /health
GET /api/report-stream/events?stream_key=...&last_id=...
```

Redis 连接配置：

- `REDIS_DB` 写入 server 环境配置，缺省值为 `3`。
- `REDIS_DB` 是 logical database 的唯一来源；即使 `REDIS_URL` 带 `/0` 等路径，也必须移除该路径并以 `REDIS_DB` 为准。
- Redis 密码只从 `REDIS_PASSWORD` 或 `REDIS_URL` 的认证信息读取，不写入源码、日志或前端配置。

### `GET /health`

- 检查 Node server 是否启动。
- 检查 Redis 是否可连接。
- 不包含报告业务状态。

### `GET /api/report-stream/events`

参数：

```ts
interface ReportStreamEventsQuery {
  stream_key: string
  last_id?: string
}
```

传输规则：

- `stream_key` 使用报告提交接口返回的完整 Redis key。
- Node 必须校验 key 非空并符合允许的报告 Stream 前缀，禁止读取任意 Redis key。
- `last_id` 缺省时使用 `0-0`，用于完整历史回放。
- 传入 `last_id` 时只读取该 ID 之后的新 entry。
- 使用 `XREAD`，不使用浏览器 consumer group。
- 每个 SSE 连接使用独立 blocking Redis client。
- SSE `id` 使用 Redis Stream entry ID。
- SSE `data` 使用 entry 中 `data` 字段的原始字符串。
- Node 不根据 `data.type` 设置业务状态，不转换任务字段，不排序业务步骤。
- 没有新消息时发送 heartbeat。
- Node 不识别 `done`，前端收到 `done` 后中止 SSE。
- 浏览器断开后必须释放 blocking Redis client。
- 缺失 `data`、Redis 异常或连接错误只做传输层错误反馈，不能伪造报告业务事件。

以下旧接口不再属于目标方案：

```text
GET /api/report-stream/snapshot
GET /api/report-stream/structure
```

## Redis Stream 原始事件

前端需要识别：

```text
question
step.start
step.meta
step.chunk
step.done
plan.update
final
done
```

关键字段：

```ts
type PlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface PlanUpdateEvent {
  type: 'plan.update'
  tasks: Array<{
    content: string
    status: PlanTaskStatus
    priority?: 'high' | 'low' | string
  }>
  source?: string
  version?: number
}

interface StepChunkEvent {
  type: 'step.chunk'
  id: string
  output_type: 'text' | 'markdown' | 'code' | 'image' | 'html' | string
  content: string
}
```

事件中的 `step` 不是可靠的 ToDo 序号：同一个步骤 ID 可能先出现正整数 `step`，再出现 `step: 0` 的工具明细。前端的唯一时序依据是 Redis entry ID。

## 前端事件聚合规则

### 顺序与去重

- 按 Redis entry ID 的 `毫秒时间戳-序号` 比较顺序。
- 同一个 entry ID 只处理一次。
- 不使用事件 `step` 字段判断全局先后关系。
- 同一个业务步骤通过事件 `id` 合并其 `step.start/meta/chunk/done`。
- 不能解析的 JSON 或缺少 `type` 的事件跳过并记录可读错误，不中断其他事件。

### 顶部思考阶段

- 从 `question` 到第一条 `plan.update` 之前的全部 `step.*` 归入顶部思考执行记录。
- 思考区初始默认展开。
- `title: "思考中"` 可作为占位状态；同一 `id` 后续出现实际工具标题时合并更新。
- 允许展示标题、`detail`、工具/Skill 名称、`action_intention` 和经过整理的公开输出摘要。
- 不直接展示 `thought`、`action_reason`、完整 `action_input`、系统提示词或内部推理文本。
- 第一条 `plan.update` 到达后自动收起思考区，用户仍可手动重新展开。

### ToDo 与执行步骤

- 第一条 `plan.update` 到达后自动展开 ToDo。
- 每条 `plan.update.tasks` 是当前完整计划快照，前端覆盖更新任务内容和状态。
- `completed` 计入完成数，`cancelled` 显示为已取消但不计入完成数。
- 用户不能编辑、勾选或排序 ToDo。
- 当前没有 ToDo ID 或直接关联字段，步骤归属使用 Redis 时序分段：
  - 某条 `plan.update` 到下一条 `plan.update` 之间的 `step.*`，归入该计划快照中当时的 `in_progress` 项。
  - 下一条 `plan.update` 到达后更新任务状态，并将后续步骤归入新的 `in_progress` 项。
  - 重规划或任务文本变化时保留此前已经产生的执行记录，不倒序重分配。
  - 无法找到 `in_progress` 项时，步骤进入该报告的“未归属执行记录”，不得猜测任务下标。
- 执行中的 ToDo 也可展开并实时追加中间步骤，删除“只有完成后才能查看”的限制。
- 不请求 Structure 接口，不展示数据库结构化数据面板。

### 报告候选与整体终态

- 任意 `step.chunk.output_type` 为 `html` 或 `markdown` 时，立即成为报告候选并自动打开右侧报告区。
- 该规则同样适用于第一条 `plan.update` 之前出现的 Markdown。
- 后续 HTML/Markdown 候选按 Redis entry ID 覆盖当前候选，右侧显示最新内容。
- HTML 使用 sandbox iframe；Markdown 使用只读 Markdown 渲染。
- HTML 中的图片、字体等外部资源必须由后端提供绝对 URL；前端不代理或猜测 `/images/*` 的来源。
- `final` 作为最终文本摘要展示，不等同于报告终态。
- `done` 是整个 Redis 事件流的终态：
  - 已存在 HTML/Markdown 候选时，整体状态设为完成，最后一个候选成为最终报告文件。
  - 不存在任何报告候选时，整体状态设为失败，提示“未收到报告文件”。
  - 即使最后一条 `plan.update` 的 `source=terminate` 且 tasks 为 `cancelled`，仍按原状态显示这些任务，不将其伪装为 completed。
- 前端处理 `done` 后主动中止该 task 的 SSE 连接。

## 页面与交互

- 报告模式继续使用当前会话页面外壳和输入框。
- 用户问题在右侧，报告回答在左侧。
- 报告回答包含：顶部思考、ToDo 执行流、最终报告文件卡。
- 报告候选首次出现时自动进入左右双栏：
  - 左侧保留当前报告对话、滚动位置和输入框。
  - 右侧展示最新 HTML 或 Markdown。
- `done` 后在 ToDo 下方展示报告文件卡，点击可以重新打开右侧报告。
- 关闭右侧报告后恢复单栏。
- 窄屏使用“对话 / 报告”切换，不强制并排。
- 普通对话模式的页面、接口、状态和渲染结果不受影响。

## 验收标准

- 报告发送使用 `POST {baseApi}/chat-proxy/api/v1/chat/report`，不使用旧普通对话接口和入口 SSE。
- `conv_id/session_id` 正确来自会话列表的 `convUid/sessionId`。
- 成功返回的 `task_id/stream_key` 被正确标准化并持久化。
- 同一会话多个 task 可以按 Stream 尾部序号恢复并独立读取 Redis。
- Node 仅原样传输 Redis entry，不再提供业务 Snapshot 和 Structure 聚合。
- 页面刷新、切换会话、断线恢复均不会丢失已有报告问答。
- 首个 plan 前的步骤进入思考；首个 plan 到达后思考收起、ToDo 展开。
- ToDo 状态支持 `pending/in_progress/completed/cancelled`，执行中步骤可实时查看。
- Redis entry 按 ID 顺序处理并正确去重，同一 step ID 正确合并。
- 任意 HTML/Markdown chunk 能立即打开右侧报告，最新候选覆盖旧候选。
- `done` 后显示最终报告文件；无报告候选时明确失败。
- HTML iframe 无法访问宿主 Cookie、localStorage、顶层页面、弹窗和表单。
- 普通对话功能和样式回归正常。

## 实现与后续联调测试要求

当前基础实现已经运行纯函数、存储、接口、Node build/test 和前端生产构建验证。后续真实服务联调仍至少覆盖：

- 报告 POST 请求字段映射、202 响应和失败响应。
- IndexedDB 写入、幂等更新、会话过滤、Stream 序号解析、多 task 稳定排序、旧记录兼容和写入失败降级。
- Redis ID 比较、排序、去重和断线续读。
- 首个 plan 前思考聚合、首个 plan 后自动切换。
- plan 快照覆盖、任务状态统计、时序分段和未归属步骤。
- 同 step ID 的 start/meta/chunk/done 合并。
- HTML/Markdown 候选即时预览、候选覆盖和 `done` 固化。
- `done` 无报告候选失败。
- 页面刷新、会话切换、页面重新打开和多个 task 并行恢复。
- Node 原样回放、heartbeat、客户端断开资源释放和非法 Stream key 拒绝。
- HTML sandbox 与绝对资源 URL 渲染。
- 普通对话模式回归。
- 相关前端 unit/typecheck/build、Node build/test 以及 `git diff --check`。

## 已知前置条件

- 后端需要保证 Redis Stream 在前端恢复周期内保留完整事件，否则 IndexedDB 只能定位任务，不能恢复已被裁剪的内容。
- 后端需要将最终 HTML 中的图片等资源改为绝对 URL。
- 当前事件没有稳定 ToDo ID；V1 按已确认的 Redis 时间顺序分段，无法归属时必须显式进入未归属记录。
- 已确认真实协议为“一 task 一 Stream”，不会在同一真实 Stream 的 `done` 后继续混入下一个问题；此前观察到的混流来自重复使用的历史测试 key，不作为生产协议兼容目标。
- 已确认 Stream key 最后一个数字段是同一会话内问题顺序（`0/1/2/3...`），前端必须持久化该序号并按它恢复多问题顺序。
