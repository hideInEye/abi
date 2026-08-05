# 报告模式历史合并与 Java Redis Stream 接入需求

## 文档状态

- 状态：报告提交已移除 `group_id` 并改传所选数据语义叶子节点的 `schema_id`；定向测试、类型检查和生产构建已通过。
- 日期：2026-08-05。
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
9. 报告模式与交互模式使用同一数据选择前置校验：选择数据语义或上传 Excel 后才能发送消息。
10. 报告预览打开及退出动画期间隐藏底部聊天输入区；报告预览完全关闭后恢复输入区。
11. 右侧 HTML 报告只由 iframe 内部负责正文滚动，外层不产生竞争滚动条，固定的报告标题栏不得覆盖 iframe 顶部正文。
12. 输入区随报告预览打开和关闭执行约 600ms 的淡出/淡入及高度收展动画，组件实例和未发送草稿始终保留。

## 非目标

- 不重构普通对话接口、普通消息渲染和分享业务。
- 不让前端或浏览器直接连接 Redis。
- 不保留 Node server、Snapshot 或 Structure 接口。
- 不展示模型内部 `thought`、完整 `action_input`、系统提示词或原始思维链；只展示标题、工具名、`action_intention`、`action_reason` 和公开输出摘要。
- 不实现报告编辑、导出、分享、列表或独立详情路由。
- 不把半截 JSON、残缺 HTML 或仍在拼接的 text chunk 直接交给 iframe，也不通过反复替换 `srcDoc` 模拟流式渲染。

## 接口边界

### 发送前置校验

- 交互模式和报告模式发送前都必须存在有效的数据选择。
- 有效数据包括：已选择的数据语义 `schemaId`，或已上传的 Excel `file_id`。
- 两者都不存在时，沿用交互模式现有提示“选择已有数据或上传excel，即可开始对话”，并立即结束发送流程。
- 校验失败时不得创建新会话、不得写入报告占位消息、不得调用普通对话接口或报告提交接口。
- `ChatInput.handleSend` 必须先完成数据校验；只有校验通过后才能依次调用 `onSend` 和清空输入框。
- 校验失败时保留用户已经输入的问题，便于选择数据后直接继续发送。
- 父级统一发送入口继续保留同一校验作为防御性兜底，但不得依赖父级返回结果决定输入框是否清空。
- 本次只统一发送限制，不修改数据选择组件、Excel 上传流程或报告提交协议。

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
  schema_id: number | string
  conv_id: string
  session_id: string
  user_id: number
  embed_model_id?: number
  chat_model_id: number
  app_type?: string
}
```

- 报告提交不再发送会话分组 `group_id`。
- `schema_id` 直接来自 `ChatInput.onSelectData` 选中的 `node.schemaId`；数据语义分组节点不可选，只有 `type='schema'` 的叶子节点能够更新该值。
- 前端不得用对话分组 ID、数据语义分组 ID 或节点 `id` 代替 `node.schemaId`，也不得擅自转换 `schemaId` 的现有 `number | string` 类型。
- 报告链路中仅为 `group_id` 存在的 `sessionGroupId` 透传参数应删除；路由和会话列表自身的分组逻辑保持不变。
- 本次不修改普通交互请求；普通交互继续使用现有 `context.extra.semantic_id`。
- 仅上传 Excel 而没有选择数据语义时，保持当前发送前置校验不变，报告提交中的 `schema_id` 使用空字符串，不在本次扩大为新的产品限制。

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

## 报告预览输入区与滚动边界

- 右侧报告处于打开状态或正在播放关闭动画时，底部聊天输入框和免责声明整体隐藏且不占据页面高度；预览动画结束并完全关闭后再恢复显示。
- 本次显隐只跟随报告预览的挂载状态，不清空输入内容，也不修改普通对话和报告发送逻辑。
- 输入区不能再通过 `display: none` 瞬间切换；需要使用约 600ms 的透明度、轻微位移和高度收展过渡完成淡出/淡入。
- 动画过程中 ChatInput 必须持续挂载；隐藏态禁止鼠标交互，动画结束后的折叠态不得继续占据对话区域高度。
- 动画承载层不得裁切或覆盖 ChatInput 原有的边框、圆角、阴影和 `focus-within` 上移效果；普通态与选中态必须保持动画开发前的视觉样式。
- `prefers-reduced-motion: reduce` 下取消输入区动画并直接切换最终状态。
- 右侧报告标题栏与正文区使用纵向 Flex 布局：标题栏固定占据自身高度并禁止压缩，正文区占用剩余高度。
- HTML 报告正文由 iframe 自身滚动，承载 iframe 的外层正文区必须禁用纵向滚动，避免外层与 iframe 出现嵌套滚动冲突。
- Markdown 报告继续由外层正文区滚动，不改变现有只读渲染行为。
- 报告容器、过渡包装层和正文区必须正确设置 `min-height: 0` 与 overflow 边界；不得通过取消最外层 overflow 让内容越过标题栏。
- 验收时需确认：打开 HTML 报告后输入区不可见；滚动到报告最顶部时首行正文完整可见且不被标题栏覆盖；关闭动画完成后输入区恢复。
- 本次不得修改报告数据聚合、接口、历史恢复、发送校验、侧栏入口或其他无关页面逻辑。

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
- 未选择数据语义且未上传 Excel 时，交互模式和报告模式都不能发送；选择任意一种数据后可继续原有发送流程。
- 未选择数据时点击发送或按 Enter 均不会调用 `onSend`，输入框中的问题不会被清空。

## 测试要求

- 优先运行与 chat 和 ABI 相关的类型检查、测试或构建命令；如项目门禁本身不可用，需说明原因。
- 对受影响文件进行代码级回归检查。
- 数据选择校验测试覆盖无数据、仅数据语义、仅 Excel，确认报告模式不能绕过统一校验。
- `ChatInput.handleSend` 回归检查需确认校验顺序为“校验 → `onSend` → 清空”，失败分支不清空问题。
- 完成后生成 run log，记录修改、验证、风险和是否需要更新 `.ai/` 长期文档。

## 2026-07-16 追加：图谱筛选列表搜索与折叠

### 目标

- 实体筛选和关系筛选标题后分别增加名称搜索框，仅过滤对应筛选项。
- 实体筛选和关系筛选的名称搜索框均使用 300ms 防抖后再执行本地过滤。
- 两类筛选项默认展示前 5 条，超过 5 条时展示“点击查看更多”。
- 展开后保持筛选区域高度稳定，通过局部滚动展示全部匹配项，并将操作文案改为“收起更多内容”。
- 保持现有全选、半选和图谱本地过滤行为不变。

### 非目标

- 不修改图谱查询接口、查询参数和 X6 画布逻辑。
- 不修改实体、关系配置及属性建模模块。
- 不引入全局样式。

### 验收标准

- 实体名称搜索与关系名称搜索互不影响，空关键词恢复完整列表。
- 实体名称搜索与关系名称搜索输入后 300ms 再更新筛选结果。
- 选项不超过 5 条时不展示展开文案；超过 5 条默认仅显示 5 条。
- 展开后列表容器高度不增长，可滚动查看全部匹配项；收起后恢复前 5 条。
- 构建和相关测试通过，不覆盖既有改动。

## 2026-07-16 追加：全系统批量删除按钮危险态统一

### 目标

- 全系统所有列表的批量删除按钮在未选择数据时继续保持禁用灰色。
- 选择数据、按钮可用后，统一展示为与本体网络一致的红色危险按钮。
- 所有批量删除按钮统一在文案前展示删除图标。
- 选中数据后，按钮文案统一追加当前选中数量，如“批量删除(2)”。
- 所有批量删除按钮文案统一为“批量删除”，不再使用“批量删除数据”“批量取消授权”等变体。

### 非目标

- 不修改列表选择、删除确认、接口调用及删除结果处理逻辑。
- 不修改单条删除按钮和其他普通操作按钮样式。

### 验收标准

- 所有包含批量删除操作的列表按钮均具备 `danger` 外观。
- 所有批量删除按钮均具备删除图标，且文案统一为“批量删除”。
- 所有批量删除按钮均在选中数据后展示选中数量。
- 原有 `disabled` 条件和点击事件保持不变。
- 批量删除按钮不再被普通幽灵按钮或主按钮样式覆盖危险色。

## 2026-07-16 追加：ABI 列表切卡片清空批量选中态

### 目标

- ABI 应用中所有支持列表/卡片视图切换的列表页，在从列表切换到卡片视图或切换视图时清空表格选中数据。
- 避免切到卡片视图后批量删除按钮仍因旧的 `selectedRowKeys` / `checkedRowKeys` 可点击。
- 保持原有批量删除接口、确认弹窗和列表数据逻辑不变。

### 非目标

- 不修改单条删除、分页、搜索、接口请求逻辑。
- 不修改非 ABI 应用。
- 不重构表格/卡片组件布局样式。

### 验收标准

- ABI 中所有包含批量删除和列表/卡片切换的页面，切换到卡片视图后批量删除按钮不可点击。
- 切回列表后需要重新选择数据才能执行批量删除。
- 没有批量选择能力的视图切换页面不受影响。

## 2026-07-16 追加：属性建模维度时间维配置调整

### 目标

- 时间维的时间粒度枚举调整为：年/year、半年/half_year、年季/quarter、年月/month、年周/week、年月日/day。
- 维度新增/编辑基础信息中删除独立的时间字段、时间格式表单项。
- 时间格式改为关联字段表格列，默认值为 `yyyy-MM-dd`，并随对应关联字段一起提交给后端。
- 关联字段表格固定高度，内容超出后内部滚动。
- 时间维层级配置删除快捷生成时间层级入口和相关自动生成逻辑，左侧改为展示已选时间粒度并支持拖拽生成层级结构。

### 非目标

- 不调整维度列表、分组、预览数据、相关指标逻辑。
- 不修改层级编辑接口协议。
- 不运行构建或完整测试，只做静态路径和关键逻辑检查。

### 验收标准

- 时间维基础信息只保留时间粒度，不再出现时间字段、时间格式两个独立字段。
- 关联字段表格在时间维下展示时间格式列，且保存时每个关联字段对象包含 `timeFormat`。
- 层级配置弹窗不再出现“快捷生成时间层级”及生成按钮。
- 时间维层级配置左侧显示时间粒度选项，而不是关联字段。

## 2026-07-17 追加：会话消息导航条（千问式定位）

### 需求类型

前端交互功能新增（纯前端）。

### 背景

参考千问对话界面：在会话区右侧提供一条消息导航条（minimap），支持快速定位到历史提问。

### 目标

- 在 chat 会话区右侧新增贴边导航条，每根横杠对应一轮用户提问（不含 AI 回答）。
- 默认低透明度；鼠标进入导航区域时整体提亮，并在其左侧弹出问题预览列表（截断问题文本）。
- 预览项与横杠一一对应，hover 某项高亮对应横杠，点击平滑滚动定位到该条用户消息。
- 跟随滚动实时高亮当前所在轮次。

### 非目标

- 不改动消息渲染、批量删除、重新生成、分享等既有逻辑。
- 不涉及后端接口。
- 不接入虚拟列表（`virtualized`）分支。

### 影响范围预期

- 新增：`apps/chat/src/components/conversation/components/MessageNavRail.tsx`
- 修改：`apps/chat/src/components/conversation/components/MessageList.tsx`
- 新增 run log：`.ai/runs/2026-07-17-message-nav-rail/`

### 验收标准

- 多轮对话右侧出现横杠，数量等于用户提问轮数；单轮对话与分享模式不显示。
- 悬停弹出预览列表，问题文本正确截断。
- 点击横杠或预览项平滑定位到对应用户消息。
- 上下滚动时当前横杠/预览项高亮实时跟随。
- 批量删除、重新生成版本切换、发送后自动滚底等既有行为不受影响。

## 2026-07-22 追加：ABI 列表页搜索栏统一为「输入框 + 高级筛选」

### 需求类型

前端 UI 统一重构（纯前端，不改接口协议）。

### 背景

用户要求将 ABI 应用中「主页更多空间、工作台、组件」下所有列表页的搜索栏统一为：搜索输入框占满一行自适应 + 右侧「高级筛选」按钮（风格参考图谱探索工具栏按钮，但增加文字）。除搜索输入框外的其他筛选项（下拉、时间范围）全部收进高级筛选弹出面板，面板内一行两个筛选项，底部为重置/查询按钮（参考图谱探索的高级搜索面板）。开始时间/结束时间独立选择改为单个时间范围 RangePicker（日期精确到天，弹出双日历面板，不再出现时间列）。

### 目标

- 新增共享组件 `SearchFilterBar`（搜索行 + 高级筛选 Popover 面板）。
- 改造页面：space-list、app-workshop(my-collect/my-share/recently-used)、assistant-config、data-collection、data-source、data-table-meaning、job(time/log/email)、ontology-kg(relation/entity/technical-jargon/recommended-inquiries/label-meaning 两个搜索栏)、component(api-key/data-dictionary/effect-review/model/plugin/skills/tools)。
- 时间范围统一为 `RangePicker`（format YYYY-MM-DD，无 showTime）；对需要提交时间的接口按 startOf('day')/endOf('day') 映射，保持查询语义。

### 非目标

- 不改造大屏（screen-manage）与本体网络图谱探索（kggraph）。
- 不修改 manage/、space/ 等门户管理页面。
- 不修改后端接口、查询参数含义、表格/分页逻辑。
- 不改造抽屉/弹窗内部的次级搜索。

### 验收标准

- 各页面搜索行为一行：输入框自适应占满剩余宽度 + 高级筛选按钮（漏斗图标+文字）。
- 高级筛选面板筛选项一行两个，底部重置/查询，交互与原查询/重置一致。
- 时间范围为单控件双日历，精确到天。
- 类型检查/构建不引入新错误。

## 2026-07-23 追加：搜索输入框停止输入自动查询（防抖，去回车）

### 需求类型

前端交互调整（纯前端，不改接口协议）。

### 背景

用户要求 ABI 项目所有搜索输入框改为：停止输入 2s 后自动发起查询接口，不再需要回车触发。

### 目标

- 共享搜索栏 `SearchFilterBar`（abi 与 dashboard 两份）默认输入框停止输入 2s 后自动查询。
- 使用自定义 `searchSlot` 输入框的页面（api-key、job/email、job/time、job/log、effect-review、ontology-kg/entity）同样具备停止输入 2s 后自动查询。
- 保留回车立即查询（并取消未触发的防抖定时器，避免重复请求）。
- 清空输入框（allowClear 或删空）时立即查询，不等待 2s。
- 高级筛选面板内的下拉/时间范围仍仅在点击「查询」时生效，不参与自动查询。

### 非目标

- 不修改查询接口、查询参数含义、分页与表格逻辑。
- 不改造抽屉/弹窗内部次级搜索。
- 不改造大屏图谱探索（kggraph）等未使用统一搜索栏的输入。

### 影响范围

- `apps/abi/src/components/SearchFilterBar.tsx`
- `apps/dashboard/src/pages/home/project-list/SearchFilterBar.tsx`
- `apps/abi/src/pages/component/applications/api-key/index.tsx`
- `apps/abi/src/pages/workbench/job/{email,time,log}/index.tsx`
- `apps/abi/src/pages/component/data/effect-review/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx`
- `.ai/runs/2026-07-23-search-input-debounce/`

### 验收标准

- 各搜索输入框停止输入约 2s 后自动发起查询，无需回车。
- 回车仍可立即查询；清空输入框立即查询。
- 高级筛选下拉/时间选择不触发自动查询，仍由「查询」按钮生效。
- 类型检查不引入新错误（沿用仓库既有 pre-existing 报错）。

## 2026-07-28 追加：ABI 外层大背景与毛玻璃侧边栏对齐 chat

### 需求类型

前端样式微调（纯 CSS，不改逻辑）。

### 背景

chat 应用外层 Layout 有一层大背景渐变（#d5daf5 → #dfe6f8 → #e2d9f3），侧边栏为半透明毛玻璃透出该背景；ABI 没有这层外层背景，侧边栏为不透明 `--abi-card-bg`。用户要求给 ABI 也加上这层外层大背景，使两应用侧边栏视觉一致。

### 目标

- ABI `body` 增加与 chat 一致的外层大背景渐变。
- ABI 左侧 72px 导航栏保持半透明毛玻璃（透出 body 渐变），背景声明需 `!important` 压住 antd Sider 默认背景。

### 非目标

- 不修改各页面内容区的 `--abi-card-bg` 不透明底色。
- 不修改卡片/抽屉/弹窗背景。

### 验收标准

- ABI 侧边栏透出蓝紫渐变，视觉与 chat 侧边栏一致。
- 内容区、卡片、弹窗等其他区域视觉不变。

## 2026-07-29 追加：dashboard 微应用样式隔离

### 需求类型

前端缺陷修复与微前端样式治理。

### 背景

dashboard 作为 qiankun 微应用挂载到 ABI 时，dashboard 全局 `html/body` 背景样式会覆盖宿主 ABI 的 `body` 背景，导致 ABI 半透明 global-sider 在进入「工作台 > 应用工坊 > 我的大屏」后视觉发生变化。

### 目标

- ABI 加载 dashboard 微应用时启用 qiankun 样式隔离。
- dashboard 背景从全局 `html/body` 挪到 dashboard 自身应用根节点，避免污染宿主页面。
- 将“以后生成或接入微应用必须隔离样式，禁止子应用全局 body/html 背景污染宿主”的规则写入 `.ai` 长期文档。

### 非目标

- 不修改 dashboard 业务页面、设计器逻辑和接口逻辑。
- 不修改 ABI global-sider 当前视觉参数。
- 不引入新的微前端框架或大范围样式重构。

### 验收标准

- 进入 dashboard 微应用页面后，dashboard 样式不会覆盖 ABI 宿主 `body` 背景。
- dashboard standalone 运行时仍保留自身页面背景。
- 后续 AI/开发者在新增微应用时能从 `.ai` 文档看到样式隔离要求。

## 2026-07-29 追加：ABI global-sider 背景固定为不透明色

### 需求类型

前端样式微调（纯 CSS，不改逻辑）。

### 背景

ABI 72px global-sider 使用 `rgba(255, 255, 255, 0.38)` 半透明背景时，视觉颜色会受宿主 body 背景、微应用样式污染或页面背景变化影响。用户要求撤回布局层透明化方案，改为将 global-sider 背景固定成不透明十六进制颜色，确保颜色不再随底层背景变化。

### 目标

- 撤回上一轮 ABI 布局外壳、二级菜单、内容区透明化改动。
- 将 `apps/abi/src/layouts/modules/global-sider/index.scss` 中 `.abi-nav-sider` 背景从透明 rgba 改为不透明 hex。
- 保留原有内容区、二级菜单、卡片、抽屉、弹窗背景逻辑。

### 非目标

- 不修改动态 router 目录。
- 不修改 dashboard 子应用业务逻辑。
- 不重构菜单数据、权限、路由跳转逻辑。
- 不继续调整二级菜单和页面内容区背景。

### 验收标准

- `.abi-nav-sider` 使用不透明十六进制背景色，不再依赖底层背景混色。
- 上一轮 `global-content`、`global-menu`、`manage-menu`、`global.css` 的布局透明化改动已撤回。
- 修改不引入格式错误。

## 2026-07-30 追加：数据集 SQL 模式保存参数对接（后端口径）

### 需求类型

前端接口对接（保存参数改造），无 UI 变化。

### 背景（后端确认的存储口径）

- 快速模式 `viewType='union'`，SQL 模式 `viewType='sql'`；新增调 `addDataSet`，编辑调 `saveDataSet`。
- SQL 模式不传 `allFields`。
- SQL 原文仍由后端从 `union[0].currentDs.tableInfo.sql` 提取（union 假节点结构不变）；`unionSql` 保持原样（union 的序列化）。
- 新增参数 `viewHistory`（字段名经两次调整：unionSql → viewInfo → viewHistory）：存「选择表」抽屉勾选的表结构（平铺数组，每表一个 `currentDs` + `currentDsFields`，格式对齐快速创建的 union）。
- 勾选记录的保存/回显由此顺带解决，无需单独接口。

### 目标

- `saveSql`：新增 `viewHistory` 参数存勾选表结构 JSON；`unionSql`/`union` 保持原样；去掉 `allFields`；新增/编辑按 id 分流 `addDataSet`/`saveDataSet`。
- 勾选状态从 SqlModeEditor 提升到 `[id].tsx` 页面级（受控 props），保存时可取。
- 抽屉勾选模型升级为字段对象数组（`Record<tableName, {originName, comment}[]>`），保存时直接组装 `currentDsFields`。
- 编辑回显：详情接口 `viewHistory` 解析→抽屉勾选状态；无效/假节点跳过不回显。
- 切换数据源时清空勾选。

### 非目标

- 不改抽屉 UI 交互、不改快速模式保存逻辑、不动 AI 生成 SQL 功能。

### 验收标准

- SQL 模式保存报文：无 `allFields`；新增 `viewHistory` 为勾选表结构 JSON；`unionSql`/`union` 与改前一致；新增走 addDataSet。
- 编辑已保存的 SQL 数据集，抽屉勾选正确回显。
- tsc 不新增报错。

## 2026-08-04 追加：效果评审模型评估双报错与超时修复

### 需求类型

前端缺陷修复（报错提示去重 + 请求超时调整）。

### 背景

效果评审「人工评估」抽屉中的「AI评估」调用 llmeval 接口：
1. 接口报错时前端同时弹两条提示（请求层统一报错 + 抽屉里额外补的 `message.error`），且超时报错与“模型评估失败”叠加；
2. llmeval 后端耗时较长，超过默认 30s axios 超时，每次都触发超时报错。

### 目标

- 模型评估失败时只弹出一条提示：移除抽屉内重复的 `message.error`，报错统一由请求层弹出。
- 请求层后端业务报错兼容旧接口的 `err_msg` 字段作为 `msg` 兜底，保证弹出的唯一提示是真实错误内容。
- `fetchModelEval` 单独放宽超时至 3 分钟。
- AI 评估成功后优先使用 llmeval 接口直接返回的 `eval_llm` / `llm_opinion` 展示结果，避免二次查询详情导致数据不一致或延迟。

### 非目标

- 不修改其他接口的超时与报错逻辑（仅新增 `err_msg` 兜底，`msg` 优先级不变）。
- 不修改模型评估成功后的详情回查与结果展示逻辑。

### 影响范围预期

- `apps/abi/src/pages/component/data/effect-review/modules/effect-review-operate-drawer.tsx`
- `apps/abi/src/service/request/error.ts`
- `apps/abi/src/service/api/assistant-manage.ts`
- `.ai/runs/2026-08-04-model-eval-error-and-timeout/`

### 验收标准

- AI 评估接口失败（业务错误/超时）时仅弹出一条提示，不再出现两条叠加。
- 模型评估正常耗时（>30s）不再触发前端超时；3 分钟内返回可正常展示评估结果。
- tsc 不新增报错。

## 2026-08-04 追加：邮件记录简化状态 displayGroup 展示与筛选

### 需求类型

前端接口字段对接 + UI 调整。

### 背景

邮件列表接口 `/shared/list` 返回数据新增 `displayGroup` 字段，记录简化状态（4 类：处理中 / 已生成 / 成功 / 失败）。原始状态 7 类：-1 已删除、0 待处理、1 生成日报中、2 日报已生成、3 已发送、4 发送失败、5 文件生成失败。映射关系：0、1→处理中；2→已生成；3→成功；4、5→失败。

### 目标

- 邮件记录列表/卡片状态列展示 `displayGroup` 简化状态（处理中/已生成/成功/失败）。
- 点击状态可看全部状态详情（Popover：原始状态文案 + 发送时间，发送失败附 reject 原因）。
- 高级筛选「任务状态」下拉改为 4 类简化状态，基于 displayGroup 前端过滤（与时间范围同为前端筛选）。
- `displayGroup` 兼容中文文案或 1~4 数字；缺失时按原始 status 推导兜底。

### 非目标

- 不修改后端接口与查询参数协议。
- 不改动下载、删除等其他操作逻辑。

### 影响范围预期

- `apps/abi/src/types/job.ts`
- `apps/abi/src/pages/workbench/job/email/index.tsx`
- `.ai/runs/2026-08-04-email-display-group-status/`

### 验收标准

- 状态列展示 4 类简化状态，点击弹出「状态详情」显示原始状态与时间。
- 任务状态筛选下拉为 4 类，筛选/重置生效。
- tsc 不新增报错。

## 2026-08-04 追加：邮件记录任务状态筛选改为点击查询才生效

### 需求类型

前端交互缺陷修复（纯前端，不改接口协议）。

### 背景

邮件记录页高级筛选的「任务状态」下拉使用普通 `ASelect`，选中选项后立即触发前端过滤；与「高级筛选下拉控件延迟生效规范」不符（应仅在点击「查询」时生效，与时间范围 `DeferredRangePicker` 行为一致）。

### 目标

- 「任务状态」下拉改用 `DeferredSelect`：选中时仅更新草稿值，点击「查询」按钮才提交并过滤列表；点击「重置」清空草稿与已生效值。

### 非目标

- 不修改时间范围筛选、任务名称搜索、分页与列表渲染逻辑。
- 不修改 `SearchFilterBar` 共享组件本身。

### 影响范围预期

- `apps/abi/src/pages/workbench/job/email/index.tsx`
- `.ai/runs/2026-08-04-email-status-filter-deferred/`

### 验收标准

- 邮件记录高级筛选选择任务状态后列表不立即变化，点击「查询」后才按状态过滤。
- 点击「重置」后状态筛选与时间范围均清空并恢复全量列表。
- tsc 不新增报错。
