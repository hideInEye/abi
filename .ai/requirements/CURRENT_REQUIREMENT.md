# 报告模式历史合并与 Java Redis Stream 接入需求

## 文档状态

- 状态：报告链路、HTML 打字机、全局侧栏入口调整和报告双栏过渡代码已完成并通过自动化检查，待登录态实机视觉复核。
- 日期：2026-08-03。
- 当前分支：`dev/zanghb-20260720-chatreport`。
- 影响范围：`apps/chat` 报告模式、根 workspace 中旧 Node server。

本文件是本轮开发的唯一当前需求依据。旧实现中的独立 `ReportConversation` 页面分支、根 `server/`、Node `/api/report-stream/events` 以及“不调用 task 状态接口”的约定全部废止。

## 目标

1. 普通交互消息和报告消息在同一个原有对话页面中按轮次展示。
2. 输入框模式只决定新问题调用普通对话接口或报告提交接口，不再切换页面组件。
3. 完成的报告从会话历史 query 返回的 `chat_report` 轮次恢复。
4. 未完成报告从 IndexedDB 读取 taskId/streamKey，经 task 状态接口判断后连接 Java Redis Stream SSE。
5. 删除项目内 Node Redis Stream server 及其配置、测试和代理。
6. 分段 text 中的完整 HTML 成功提取后，实时任务首次自动打开右侧报告时以打字机效果逐步显现正文。
7. 系统侧栏的展开/收起入口移动到各页面内容区左上角；报告完成自动打开右侧预览时同步收起系统侧栏。
8. 报告预览打开和关闭时使用连续的渐入渐出与双栏宽度过渡，不出现瞬间跳变。

## 非目标

- 不重构普通对话接口、普通消息渲染和分享业务。
- 不让前端或浏览器直接连接 Redis。
- 不保留 Node server、Snapshot 或 Structure 接口。
- 不展示模型内部 `thought`、完整 `action_input`、系统提示词或原始思维链；只展示标题、工具名、`action_intention`、`action_reason` 和公开输出摘要。
- 不实现报告编辑、导出、分享、列表或独立详情路由。
- 不把半截 JSON、残缺 HTML 或仍在拼接的 text chunk 直接交给 iframe，也不通过反复替换 `srcDoc` 模拟流式渲染。

## 接口边界

### 报告提交

```http
POST {baseApi}/chat-proxy/api/v1/chat/report
```

请求继续使用当前已确认字段：

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

成功响应中的 `task_id / stream_key / conv_id` 标准化为 `taskId / streamKey / conversationId`。只有三个定位字段完整时才写 IndexedDB 并进入读流阶段。

### 报告任务状态

```http
GET {baseApi}/chat-proxy/api/v1/chat/report/task?task_id={taskId}
```

```ts
interface ReportTaskStatus {
  taskId: string
  status: 'pending' | 'started' | 'retry' | 'success' | 'failure' | 'revoked' | string
  completed: boolean
  successful: boolean
  message?: string
  result?: unknown
  error?: unknown
}
```

- `completed=false` 或 `pending/started/retry`：连接 Java SSE。
- `completed=true && successful=true` 或 `success`：使用 query 历史，不再连接 SSE。
- `completed=true && successful=false` 或 `failure/revoked`：展示失败，不连接 SSE。
- task 请求失败：保留已有内容，显示警告并尝试连接 SSE。

### Java Redis Stream SSE

```http
GET {baseApi}/abi-debug/v1/report-stream/events?stream_key={streamKey}&last_id={lastId}
```

- 当前 `baseApi=/api` 时完整路径为 `/api/abi-debug/v1/report-stream/events`。
- 首次或整页恢复使用 `last_id=0-0`。
- 同页断线使用内存中的最后 Redis entry ID 续读。
- SSE `id` 使用 Redis entry ID，`data` 是 Redis 原始事件内容。
- Java 只传输 Redis 内容，不聚合报告业务状态。
- 前端收到 `done` 后主动关闭连接。

## 历史 query 协议

会话进入时继续调用：

```http
POST /api/abi-chat/v1/app/message/query
```

响应按 `roundIndex` 分轮。判断规则：

- `message.chatMode === 'chat_report'`，或
- `message.messageDetail.chat_mode === 'chat_report'`

满足任一条件的轮次为报告轮次；`chatMode=null` 继续作为普通交互轮次。

完成报告的轮次由两类消息组成：

1. `human`：`messageDetail.data.content` 是用户问题。
2. `view`：`messageDetail.data.content` 是 JSON 字符串，协议为：

```ts
interface ReportHistoryPayload {
  version: number
  type: 'react-agent'
  final_content?: string
  task_plan?: ReportTask[]
  steps?: ReportHistoryStep[]
  generated_images?: string[]
}
```

历史恢复规则：

- `task_plan` 恢复最终 ToDo 快照。
- `steps` 恢复公开执行记录，包括标题、工具名、`action_intention`、`action_reason` 和公开输出摘要。
- `steps[].outputs` 恢复 text/code/image 以及 HTML/Markdown 报告候选。
- 最后一个 HTML/Markdown output 是最终报告文件。
- `todo_meta` 用于划分计划初始化、进度和完成阶段。
- `generated_images` 作为报告资源信息保留。
- 不直接渲染原始 `final_content`、`thought` 或完整 `action_input`。

后端只在报告完成后把 `chat_report` 轮次写入 query；未完成报告不会出现在 query 的报告轮次中。

## IndexedDB 与多问题顺序

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

- 复合主键为 `[conversationId, taskId]`。
- `sortOrder` 从 Stream key 最后一个数字段取得，例如 `report:{convId}:1/2/3`。
- 会话内按 `sortOrder -> createdAt -> taskId` 稳定排序。
- IndexedDB 只保存任务定位信息，不保存事件、ToDo、报告正文或 lastId。
- query 报告轮次与 IndexedDB 记录按 `conversationId + sortOrder/roundIndex` 合并，query 是已完成历史的权威来源。
- query 未出现的缓存任务先用缓存问题创建占位消息，再查询 task 状态。
- 已完成 task 暂未出现在 query 时重新请求一次历史；仍缺失则显示“报告历史同步中”，不伪造报告。
- query 已包含同一 `sortOrder` 的完成报告时，直接删除对应 IndexedDB 记录，不再请求该 taskId 的状态。
- 实时流收到整体 `done` 后，删除当前 `conversationId + taskId` 缓存；删除失败只显示非阻断警告，不覆盖已完成报告。

## 请求去重修订

- 开发环境保留 React StrictMode。
- 相同 `convUid/pageNum/pageSize` 的 message query 在前一个请求结束前复用同一 Promise，避免 StrictMode 重挂载产生两次并发网络请求。
- task 状态只查询 query 未覆盖的 IndexedDB 记录；同一份历史刷新结果不得重复触发整批 task 恢复。
- task 成功但 query 暂缺时触发的历史同步请求属于业务刷新，不与 StrictMode 并发重复请求混为一类。

## 前端状态聚合

实时 Redis 事件继续识别：

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

- 以 Redis entry ID 排序和去重，不使用事件 `step` 判断全局顺序。
- 第一条 `plan.update` 前的步骤进入顶部思考区；首个 plan 到达后思考自动收起、ToDo 自动展开。
- `plan.update.tasks` 是完整计划快照，支持 `pending/in_progress/completed/cancelled`。
- 执行中的 ToDo 可以展开查看中间步骤。
- HTML/Markdown chunk 只在前端状态中更新报告候选，不在 ToDo 执行记录中直接展示，也不提前打开右栏。
- `done` 且存在候选时完成；`done` 无候选时失败并提示“未收到报告文件”。

历史 `react-agent` payload 转换为同一套报告 UI 状态，但不得制造虚假的 Redis ID 或重新打开 SSE。历史步骤按原数组顺序展示；`todo_meta` 仅用于确定任务阶段，缺少明确归属时进入未归属执行记录。

## 页面结构

- 永远渲染原 `Conversation` 页面、Header、滚动区域和输入框。
- 普通轮次和报告轮次按 `roundIndex/sortOrder` 合并为一条时间线。
- 报告消息仍为右侧用户问题、左侧思考/ToDo/报告文件。
- 报告发送通过 `Conversation` 暴露的独立 `handleReportSend`，普通发送继续使用原 `handleSend`。
- 报告整体完成且 ToDo 全部进入 `completed/cancelled` 终态后，才显示报告文件并自动进入左对话、右报告双栏；关闭恢复单栏，窄屏使用“对话/报告”切换。
- 打字机只在当前页面实时生成任务首次自动打开右栏时播放一次；历史报告、用户关闭后手动重开以及同一报告后续查看直接展示完整正文。

## 系统侧栏入口与报告过渡

- 系统侧栏的展开/收起状态继续由聊天工作台顶层统一管理，各页面只复用同一个控制入口，不复制侧栏状态。
- 删除“新建对话”按钮右侧原有的收起入口，避免同一页面出现两个侧栏控制按钮。
- 对话页的侧栏控制按钮放在顶部模型选择器之前；没有可选模型时仍需保留该按钮。
- “应用工坊”和“技能商店”的侧栏控制按钮放在页面标题之前，并与标题垂直居中。
- 按钮在侧栏展开时表达“收起侧边栏”，在侧栏收起时表达“展开侧边栏”，提供 `title/aria-label`，并保持统一图标、尺寸、hover 和 focus 样式。
- 实时报告生成完成并自动打开右侧预览时，如果系统侧栏仍展开，则自动收起；用户手动打开任意已完成报告时也执行相同规则。
- 关闭报告预览不自动展开系统侧栏，避免覆盖用户在预览期间做出的侧栏选择；侧栏之后仍由用户手动控制。
- 报告预览打开时，右栏从轻微右移、透明状态渐入，同时左侧对话平滑收窄；关闭时反向渐出并在动画结束后卸载右栏。
- 动画采用短时长的 ease-out/ease-in 过渡，不对 iframe `srcDoc` 做逐帧替换，不重启 HTML 打字机，也不改变报告数据状态。
- `prefers-reduced-motion: reduce` 下取消位移、淡入淡出和宽度动画，直接切换最终布局。
- 窄屏继续使用“对话/报告”切换，不强制执行桌面双栏宽度动画。

## 渐进展示与产品文案

报告消息必须按生成阶段逐步显露，不能在任务刚提交时同时展示思考、空 ToDo 和报告区域：

1. 第一条计划到达前只展示“思考”区，默认展开并实时追加可公开的执行摘要。
2. 第一条计划到达后，思考区自动收起，再展示并默认展开 ToDo；执行中的任务继续实时显示公开步骤。
3. 后端生成的 HTML/Markdown 候选仅在内存中更新，在整体 `done` 且 ToDo 全部进入终态前不展示报告文件、不渲染到 ToDo 内、不打开右栏。
4. 整体完成后，在 ToDo 下方展示报告文件卡，并自动打开右侧只读报告；用户关闭后可以通过文件卡再次打开。
5. 历史完成报告进入页面时直接展示思考、最终 ToDo 和报告文件，但不播放实时生成过程。

所有面向用户的标题、提示、警告和错误必须使用产品语言，不得出现 Redis、Redis Stream、SSE、`plan.update`、entry ID、lastId、stream key、事件名称或内部错误码。上述术语只允许存在于代码、日志和开发文档中。连接中断、状态查询失败和本地恢复失败统一表达为“生成进度暂时中断”“正在自动恢复”“刷新后可能需要重新进入会话查看”等可理解提示。

## 真实事件兼容修订

2026-07-31 使用本机 `redis-cli` 对 DB0 中一条完整报告 Stream 进行了只读核对。真实数据确认：

1. 最后一条事件是整体 `done`，此前最后一份计划快照中的任务均为 `completed/cancelled`，因此页面不得继续显示执行中状态。
2. 最后仍可能存在只有“思考中 / Thought/Action/Observation”的 `step.start`，且没有对应 `step.done`。整体 `done` 到达时，前端必须把所有仍为 `in_progress` 的公开步骤收敛为终态，并且不展示没有公开内容的占位步骤。
3. 报告工具可能把 `{ chunks: [{ output_type: 'html' | 'markdown', content }] }` 结果拆成多条 `output_type: 'text'` 的 chunk；尾部还可能追加普通提醒文字。前端需要按同一 step 的 Redis ID 顺序拼接，提取第一个完整 JSON 对象并识别其中最后一个 HTML/Markdown 报告，不能仅依赖外层 `output_type`。
4. 被识别为报告工具 payload 的分段 text 只用于内部组装报告，不在 ToDo 执行记录中展示原始 JSON、HTML 或半截正文。
5. ToDo 顶部在所有任务进入终态时需明确显示已结束；存在取消任务时分别显示完成数和取消数，不能继续显示类似“2/5 已完成”而造成仍在执行的误解。

执行输出渲染规则：

- `output_type=code` 使用 Markdown fenced code block 的视觉结构展示。
- `output_type=text` 使用 Markdown 渲染，支持标题、列表、链接、行内代码和代码块。
- 渲染前将 Windows 换行及文本中的字面量 `\\n/\\r\\n` 标准化为真实换行；Markdown 文本区域保留单换行显示。
- HTML/Markdown 报告候选继续遵守渐进展示规则，只在整体完成且 ToDo 全部结束后显示报告文件与右侧预览。

右侧 HTML 打字机规则：

- 必须先取得并解析完整 HTML，再创建一次 iframe；不得把逐条 text payload 或半截 JSON 作为 `srcDoc`。
- iframe 只加载一次完整文档，动画在 sandbox iframe 内按可见文本节点逐步显现，避免刷新 iframe、重复执行报告脚本或破坏宿主状态。
- 跳过 `script/style/noscript/template/textarea/svg` 等非正文节点，不修改标签、属性、图片、图表和脚本内容。
- 保持现有 `sandbox="allow-scripts"`，不得增加 `allow-same-origin`、弹窗、表单或顶层跳转权限。
- 尊重 `prefers-reduced-motion: reduce`；用户要求减少动态效果或注入脚本被报告 CSP 阻止时，直接显示完整报告作为无损降级。
- 动画总时长设置上限，长报告不得按单字符固定速度持续数分钟；完成后移除光标，不改变最终 HTML 内容。

## 验收标准

- 普通对话功能、接口和历史渲染无回归。
- 同一会话可以交错显示 `chatMode=null` 和 `chat_report` 轮次。
- 完成报告可仅凭 query 的 `react-agent` content 恢复 ToDo、步骤和最终报告。
- 未完成报告可凭 IndexedDB taskId 调用 task 接口并继续 Java SSE。
- 多个报告问题按 Stream 尾部序号稳定展示且不重复。
- Java SSE 使用 `/api/abi-debug/v1/report-stream/events`，项目不再包含 Node server。
- 页面刷新、切换会话和断线续读不会把不同报告事件混合。
- 内部思维与完整工具输入不会出现在 UI。
- 报告发送后依次呈现思考、ToDo、报告文件，不会同时展示空阶段。
- ToDo 未全部结束前，HTML/Markdown 候选不会出现在执行记录、文件卡或右侧预览中。
- 真实数据中报告被包装为分段 text payload 时仍能恢复最终 HTML/Markdown 报告。
- 整体 `done` 后没有步骤继续显示加载状态，空的末尾“思考中”占位步骤不进入 UI。
- code/text chunk 均按 Markdown 语义展示，字面量换行符可正确换行。
- 用户界面不出现 Redis、SSE、事件名称、游标或内部错误码等实现术语。
- HTML sandbox 和 Markdown 只读渲染保持安全限制。
- 实时 HTML 报告首次自动打开时正文逐步显现，iframe 不因动画帧反复重载；关闭后从文件卡重开直接显示完整报告。
- 历史完成报告直接显示完整正文，不重放生成动画；减少动态效果时不播放动画。
- 新建对话区域不再显示旧侧栏收起按钮；对话页、应用工坊和技能商店顶部均能控制同一个系统侧栏。
- 报告预览打开时系统侧栏自动收起；关闭预览后不会擅自重新展开。
- 桌面端报告打开与关闭均有平滑的透明度、轻位移和双栏宽度过渡，关闭动画结束前报告内容不会被提前卸载。
- 动画期间 iframe 不重复加载，报告数据、对话滚动位置和输入框状态保持不变。

## 测试要求

- 历史 round 分类、`react-agent` JSON 解析和公开字段过滤。
- 普通/报告轮次交错排序、query 与 IndexedDB 去重、多 task 顺序。
- task pending/success/failure/请求异常的恢复分支。
- Java SSE URL、鉴权、`stream_key/last_id` 与断线续读。
- 现有实时 reducer 的排序、去重、候选和 done 行为。
- message query 同参数并发请求去重。
- query 覆盖任务的缓存清理与恢复队列过滤。
- Redis `done` 后删除对应 IndexedDB 任务记录。
- 展示阶段纯函数覆盖：无计划、执行中、存在候选但任务未结束、全部任务结束、包含 cancelled 终态。
- 思考/ToDo/报告文件按阶段显隐，报告只在最终阶段自动打开。
- 用户可见文案回归检查，确保不泄露 Redis、SSE、`plan.update`、lastId 等实现术语。
- 使用真实事件形态补回归测试：分段 text 中嵌套 HTML、尾随提醒文本、未闭合占位步骤、最终 completed/cancelled 计划和 done。
- chunk 内容格式化测试覆盖 code fenced block、text Markdown 和字面量换行标准化。
- HTML 打字机文档转换测试覆盖完整文档、HTML 片段、重复转换、跳过非正文节点、减少动态效果降级标记和脚本插入位置。
- 预览播放状态测试覆盖实时任务首次自动打开、手动重开及历史报告不播放。
- 侧栏控制测试覆盖展开/收起图标与可访问名称、三个页面入口位置以及旧入口移除。
- 报告预览联动测试覆盖打开时自动收起侧栏、关闭时不自动展开，以及退出动画结束后再卸载报告面板。
- 报告过渡样式需覆盖桌面打开/关闭、窄屏切换和 `prefers-reduced-motion` 降级。
- 运行报告相关 Vitest、Chat TypeScript 检查、Chat build 和 `git diff --check`。

## 已确认假设与风险

- Java SSE 沿用标准 SSE `id/data`，查询参数为 `stream_key + last_id`；若实际响应外层另有包装，只修改 API 适配层。
- query 中的 `/images/*` 资源是否可由部署同源访问取决于后端/网关；前端不猜测 Redis 或文件服务地址。
- task 已成功但 query 尚未落库属于最终一致性状态，页面显示同步提示而不是把任务标为失败。
