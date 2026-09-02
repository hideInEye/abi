# 助手分享悬浮框交互对话 AI 消息 Markdown 渲染（窄屏适配）Run Log

## 基本信息

- 日期：2026-08-31
- 任务名称：chat-widget-ai-markdown
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-08-31 追加六）
- 执行 AI：Qoder
- 任务类型：渲染/样式增强

## 需求摘要

助手分享页交互模式对话流程（选语义 → 正常对话）保持不动；将悬浮框（约 420px 宽）AI 消息从纯文本改为 Markdown 渲染，管线对齐主对话，样式适配窄屏，使问数/归因/预测类回复的表格、列表、标题、加粗能正常展示。

## 修改文件

- `apps/chat/src/components/chat-widget/ChatWidget.tsx`
  - 引入 `marked` 与 `finalizeStreamText`；模块级 `marked.use({ breaks: true, gfm: true })`（窄屏单换行保持原样换行）。
  - 新增 `cleanAiContent`（finalizeStreamText → 压缩 3+ 连续换行 → 去 HTML 标签，幂等，历史消息补做、实时流重复执行无副作用）与 `renderMarkdown`（marked 同步解析，异常降级为转义原文）。
  - 消息渲染分支：human 保持纯文本气泡；AI 改 `.abi-cw-msg-ai-body` 卡片 + `.abi-cw-md` `dangerouslySetInnerHTML`，流式空内容仍显示「正在生成...」。
- `apps/chat/src/components/chat-widget/index.css`
  - `.abi-cw-msg-ai` 改 `align-self: stretch; width/max-width: 100%`；新增 `.abi-cw-msg-ai-body`（占满宽卡片，圆角 12px 12px 12px 2px）。
  - 流式光标由内联 `.abi-cw-cursor` 改 `.abi-cw-msg-ai-body.streaming::after` 闪烁（复用 `abi-cw-blink` 动画）。
  - 新增 `.abi-cw-md` 窄屏紧凑 Markdown 样式（取值为主对话 `.markdown-content` 缩减版：12.5px 字号、紧凑标题/列表/代码块；表格 `display: block; overflow-x: auto` + `white-space: nowrap` 单元格横向滚动，不撑破面板；补 blockquote/a/hr）。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/chat/src/components/chat-widget`
- `pnpm exec tsc --noEmit`（apps/chat 目录）
- `pnpm build`（apps/chat 目录）

### 测试结果

- chat-widget 单测：3 个文件 19/19 通过（shareUrl 7、history 5、service 7）。
- `tsc --noEmit` 无输出（无错误）。
- `pnpm build` 成功（既有大 chunk 体积警告与本次无关）。

## 回归检查

- 对话流程（语义选择、会话、SSE 流、停止生成、密码校验）均未改动；`service.ts`、`history.ts` 未修改。
- `.abi-cw-cursor` 样式保留（不再被 AI 消息使用，未删除以减小 diff；如需可后续清理）。
- human 气泡样式不变；欢迎页/推荐问题不变。

## Review 结果

- `finalizeStreamText` 幂等，历史消息（未经 finalize）与实时流（已 finalize）渲染结果一致。
- marked 异常降级为转义原文 + `<br/>`，不会白屏。
- `marked` 为主应用既有依赖（^16.1.1）；widget 独立构建已移除、组件已进主应用 bundle，无新增依赖风险。

## 本轮经验

- 窄屏富文本适配的关键点是表格转块级横向滚动（`table { display: block; overflow-x: auto }`）+ 单元格 `nowrap`，避免压列导致内容折行难读。

## 是否需要更新 AI 系统

- context / prompts / agents / skills / mcp / checklists / decisions：暂不需要。

## 未解决问题

- 后端语义就绪后，实际问数/归因/预测回复若包含 view 图表结构，仍只渲染 Markdown 文本；图表渲染按需纳入后续迭代。

---

# 第二轮（2026-09-01）：对齐主对话交互模式（深度思考/图表/切换/点赞点踩）

## 需求口径变更

用户要求悬浮框与主对话完全一致：深度思考、描述分析、图表、支持切换图表、底部点赞点踩，且接口与主对话相同。追加六「不渲染图表」的非目标按用户新口径解除。

## 实施内容

### 共享抽取（行为等价重构）
- 新增 `apps/chat/src/components/conversation/helpers/chartOption.ts`：从 ViewEle 原样抽出 `processChartData/getChartOption/parseISO8601Duration/parseISODate/DEFAULT_CHART_STYLE`（样式参数化，默认值 = ViewEle 初始 chartConfig）。
- `ViewEle.tsx` 删除本地同名函数（约 430 行）改 import，调用点显式传入 chartConfig 样式；清理失效 import。

### chat-widget 数据层（接口同主对话路径）
- `service.ts`：`WidgetSession` 增加 `dbName`（session/add 响应捕获）；新增三接口路径：`/chat-proxy/api/v1/chat/db/query`（SQL 查数）、`/chat-proxy/api/v1/chat/conv/messages/round_index/max`（轮次）、`/abi-chat/v1/app/message/feedback/add`（评价）；流回调改为传原始累计全文；新增 `parseAiRaw`（think 段/尾部 JSON 结构化）、`fetchChartDataBySql`、`fetchMaxRound`、`submitFeedback`；shareCode 随 body 下发。`finalizeStreamText` 保留（既有单测依赖）。
- `history.ts`：`WidgetMessage` 新增 `thinking/chart/chartLoading/roundIndex/feedback`；新增 `WidgetChart`。

### ChatWidget.tsx 渲染与流程
- 流中：`parseAiRaw` 实时解析 thinking + 展示文本；流中隐藏未闭合尾部 JSON 片段。
- 流结束：收尾文本 → 尾部 JSON 含 sql 且有 dbName 时 `chartLoading` + SQL 查数组装图表（类型白名单同 ViewEle，非法类型回退 response_bar_chart）→ `fetchMaxRound` 写 roundIndex。
- 历史消息：加载后同一套解析补 thinking，有 sql/dbName 时按索引补图表。
- 新增子组件：`ThinkPanel`（折叠面板，流中「深度思考中...」脉冲点、完成「已深度思考」）、`ChartCard`（EChart + 7 类 pill 切换，option 复用共享 helper）；底部点赞点踩（再点同状态取消回 0，成功后高亮，防连点）。
- `index.css`：+186 行（`.abi-cw-think*`/`.abi-cw-chart*`/`.abi-cw-chart-loading`/`.abi-cw-feedback`/`.abi-cw-fb-btn`）。

## 验证

- `vitest run src/components/chat-widget`：23/23 通过（新增 4 个 `parseAiRaw` 用例）。
- `tsc --noEmit` 通过；`pnpm build` 成功。
- ViewEle 图表链路改 import 后行为等价（同一函数体，样式显式传参）。

## 回归检查

- 主对话 ViewEle：仅函数位置变化，调用语义不变；未改 handleLike/图表切换/导出等逻辑。
- widget 既有流程（语义选择、会话、SSE、停止、密码）未动；`finalizeStreamText` 保留。
- 降级：无 `db_name` 不展示图表；查数失败仅清除 loading；评价/轮次失败静默不影响主流程。

## 未解决问题 / 后续

- 历史消息的 roundIndex 依赖 message/query 返回结构，当前仅新发消息经 max round 回填；历史消息点赞若后端校验轮次可能需后端在消息中下发 roundIndex 后补映射。
- 图表卡片高度受 EChart 内置 `min-height: 300px` 约束（窄面板下偏高），如后续需要压缩再调整共享组件。
