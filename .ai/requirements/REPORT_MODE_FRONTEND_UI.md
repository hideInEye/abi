# 报告模式统一会话 UI 实施规格

## 文档状态

- 状态：渐进展示交互已实现并通过自动化检查，待真实后端数据联调。
- 日期：2026-07-31。
- 上位需求：`.ai/requirements/CURRENT_REQUIREMENT.md`。

## 目标布局

报告模式不再拥有独立会话页面。原 `Conversation` 页面同时展示普通交互与报告轮次：

```text
统一 Conversation
  ├─ 普通轮次（chatMode=null）
  ├─ 报告轮次（chatMode=chat_report）
  │    ├─ 右侧用户问题
  │    └─ 左侧思考 / ToDo / 报告文件
  └─ 原输入框（发送模式只决定请求链路）
```

完成报告来自历史 query；未完成报告来自 IndexedDB、task 状态和 Java SSE。两类数据转换为相同的 `ReportItem` 视图模型后与普通消息组统一排序。

## 历史报告适配

- 按 group 的 `roundIndex` 保持服务端顺序。
- group 中任意消息顶层 `chatMode` 或嵌套 `messageDetail.chat_mode` 为 `chat_report`，整轮交给报告适配器。
- `human.messageDetail.data.content` 作为问题。
- `view.messageDetail.data.content` 必须先解析 JSON，并校验 `type === 'react-agent'`。
- `task_plan` 映射为最终 ToDo。
- `steps` 按数组顺序映射为公开执行步骤；公开字段包括标题、工具名、`action_intention`、`action_reason` 和输出摘要，`todo_meta` 标记计划阶段。
- `outputs` 中 text/code/image 可作为执行结果摘要；HTML/Markdown 更新报告候选。
- 最后一个 HTML/Markdown output 固定为历史最终报告。
- JSON 无效时保留用户问题并展示“报告历史解析失败”，不能让整页崩溃。
- `thought`、完整 `action_input` 和原始 `final_content` 不进入渲染模型。

## 统一时间线

- 普通历史继续使用现有消息 mapper。
- 报告历史、缓存中的未完成任务和当前新提交任务使用 `ReportMessageRow`。
- 排序键优先为 `roundIndex/sortOrder`，再以 `createdAt/taskId` 稳定排序。
- query 与 IndexedDB 中同一序号的报告只展示一次；query 完成历史覆盖缓存占位。
- 切换输入模式不得卸载或清空另一模式已经显示的消息。
- 报告生成中的 loading/停止操作只影响报告请求；普通生成中的 loading/停止操作只影响普通对话。

## 恢复生命周期

1. 会话变化时取消旧会话所有报告提交和 Stream 连接。
2. 原历史 query 与 IndexedDB 读取并行进行，任一数据到达即可先渲染。
3. 对缓存 task 调用 `/chat-proxy/api/v1/chat/report/task`。
4. 未完成或状态查询失败的任务连接 `/abi-debug/v1/report-stream/events`。
5. 已成功任务使用 query 历史；query 暂缺时触发一次历史刷新并展示同步状态。
6. 失败或撤销任务展示失败，不连接 SSE。
7. 同页断线按 lastId 续读；整页加载从 `0-0` 重放；收到 `done` 主动 Abort。

## 报告消息交互

- 报告刚提交后只展示思考区，默认展开；不得同时展示空 ToDo、报告文件或右侧报告。
- 第一条 plan 到达后思考区自动收起，此时才展示并自动展开 ToDo，执行中任务也可查看公开步骤。
- 历史完成报告直接显示最终 ToDo 和执行记录，不播放自动展开动画。
- HTML/Markdown 生成片段只更新内部报告候选，不在 ToDo 中渲染正文，也不提前打开右栏。
- 整体完成且 ToDo 全部进入 `completed/cancelled` 终态后，才在 ToDo 下显示报告文件卡并自动打开右侧报告。
- 历史报告默认不抢占右栏，用户点击文件卡后打开。
- 右栏打开时左侧保留统一时间线、滚动位置和输入框。
- 关闭右栏恢复单栏；窄屏使用“对话/报告”切换。

## 用户文案约束

- 用户只看到“正在分析”“正在制定计划”“正在执行”“正在整理报告”“已完成”“正在自动恢复”等任务语言。
- 不得在消息卡、空状态、警告、错误或重试提示中出现 Redis、Redis Stream、SSE、`plan.update`、entry、lastId、stream key 或内部错误码。
- 工具名称、Skill 名称和可公开的执行摘要可以展示，但不得展示模型内部思维链、完整工具输入或底层传输细节。
- 开发注释和日志可以使用技术术语，但不得直接透传为用户文案。

## 报告渲染与安全

- Markdown 使用项目现有只读渲染，禁止把原始 HTML 注入宿主 DOM。
- HTML 使用 `iframe srcDoc` 和 sandbox，不开放 `allow-same-origin`、顶层跳转、弹窗或表单能力。
- 外部链接使用安全的新窗口属性。
- 报告中的资源地址按后端原值加载；前端不拼接 Redis、Node 或文件服务地址。

## 组件边界

- `ConversationAnalysis`：只负责输入模式和发送路由，不切换会话页面。
- `Conversation`：统一时间线、报告双栏和两个发送 handle 的组合边界。
- `useConversationController`：保留普通对话行为，并额外暴露分类后的报告历史 round 与历史刷新能力。
- `useReportConversation`：报告 task、IndexedDB、task 状态、Java SSE 和报告 UI 状态。
- 历史适配器：纯函数解析 `chat_report` round，禁止发请求或读浏览器存储。
- `MessageList`：合并普通消息组和报告消息组，不解析报告协议。
- `ReportMessageRow` 及现有子组件：只消费 `ReportItem` 视图模型。

失去用途的独立 `ReportConversation` 容器、Node stream origin 配置和 `/api/report-stream` 代理应删除。

## 异常状态

- query 报告 JSON 无效：显示历史解析错误，普通消息继续可用。
- IndexedDB 不可用：当前任务继续运行，并提示刷新后可能无法恢复。
- task 请求失败：显示警告并尝试 Java SSE。
- task 成功但 query 暂缺：显示“报告历史同步中”，不伪造报告。
- SSE 失败：按 lastId 最多重试现有约定次数，最终只标记当前报告失败。
- `done` 无 HTML/Markdown：显示“未收到报告文件”。
- 一个报告失败不得终止同会话其他报告或普通对话。

## 测试与验收

- `chatMode=null` 与 `chat_report` 分类准确，兼容顶层和嵌套字段。
- 真实 `react-agent` payload 能恢复 task_plan、steps、outputs 和 HTML。
- 内部 thought/action_input/final_content 不进入 UI 状态。
- 普通/报告/缓存任务交错排序且无重复。
- task 状态的继续、完成、失败和请求异常分支正确。
- Java SSE 地址、参数、鉴权、lastId 续读正确。
- 输入模式切换不卸载时间线；普通发送链路保持原状。
- 双栏、关闭、报告切换和窄屏切换正常。
- 无计划时只显示思考；计划到达后才显示 ToDo；所有任务结束后才显示文件卡并打开报告。
- 执行中的 HTML/Markdown 片段不在 ToDo 中泄露，用户界面无 Redis/SSE/事件游标等技术词。
- 删除 Node server 后 Chat 开发与生产构建不依赖本地 3001 端口。
