# Run Log: 归因/预测分析改为意图澄清式拼句发送

- 日期：2026-07-23
- 应用：apps/chat
- 需求来源：用户对话直述（后端 `query_recommend` 接口在 `recommend_chat_mode=analysis/forecast` 时已改为返回语义画像 metrics/dimensions/entities，不再返回现成推荐问题列表）

## 目标

- 每个回答下的「归因分析」「预测分析」按钮不再展示推荐问题列表，改为像「意图澄清」一样：内嵌一个拼句面板（可选指标/维度/时间），拼接一句自然语言后点击发送。
- 时间选择复用意图澄清的「自定义日期」弹窗（日期/周/月/季度/年粒度 + RangePicker）。

## 修改文件

1. `apps/chat/src/components/conversation/components/AnalysisForecastClarify.tsx`（新增）
   - 归因/预测拼句面板：指标（默认选中 importance 最高的第一项）、维度（可选）、时间（预设 + 自定义日期弹窗）、预测时长（仅预测模式）。
   - 拼句句式与后端推荐候选模板对齐：
     - 归因无维度：`分析{时间}{指标}变化的原因`；有维度：`分析{时间}哪些{维度}影响{指标}？`
     - 预测无维度：`查询{时间}数据并预测{预测时长}{指标}`；有维度：`查询{时间}数据并预测未来哪些{维度}{指标}增长最快？`
   - 自定义日期弹窗逻辑复制自 `IntentClarifyAnalysisMode`，复用 `intentClarifyUtils` 的 `convertDateToGranularityValue`/`formatTimeRangeValue` 输出自然语言时间段（如"2025年1月至2025年6月"）。
2. `apps/chat/src/components/conversation/hooks/useConversationController.ts`
   - `getRecommend` 返回值新增 `metrics`/`dimensions`/`entities` 透传（含异常兜底空数组）。
3. `apps/chat/src/components/conversation/ViewEle.tsx`
   - `handleAttributionClick`/`handlePredictClick` 改为请求语义画像后追加拼句模板消息，不再走 recList。
   - 移除只剩灯泡模式使用的 `recMode`（原 1/2 归因/预测模式已废弃），「换一批」恒显示于灯泡推荐列表。

## 二次调整（同日）：拼句面板改为独立模板消息

用户反馈「单独起一个模版，不要在原来的地方展示」：拼句面板不再内嵌在当前回答（ViewEle）下方，而是像意图澄清一样作为会话末尾的独立一条消息展示。

- `ViewEle.tsx`：移除 `clarifyPanel` 本地 state、内嵌渲染及 `handleClarifySend`；新增 `openClarifyTemplate`，通过 `setConvContent` 追加 `{ role: 'analysis_clarify', order: 'clarify-<ts>', context: { mode, metrics, dimensions }, _meta }` 消息（同时只保留一条）。
- `components/MessageList.tsx`：`renderItem` 新增 `role === 'analysis_clarify'` 分支，渲染 `AnalysisForecastClarify`；发送/关闭时从 convContent 中移除自身，发送走 `getAnswer({ question, _meta })`；分享模式不渲染。字符串 order 自成一组（`groupMessagesByOrder`），在 3d 分组中落入 otherItems → 独立 bodyCard 气泡；无 human 消息故不参与多版本合并/导航条/批量删除。
- 同时修正 MessageList props 类型：`setConvContent`/`setSharingList` 改为 `Dispatch<SetStateAction<any[]>>`（支持函数式更新，修复与 ViewEle prop 类型不兼容的既有告警）。
- 该消息仅存在于前端 state，不入后端历史，刷新后自然消失。
- 验证：`npx tsc --noEmit -p tsconfig.app.json` 仅剩无关既有错误 `multi-measure-pie-chart.ts(72)`。

## 验证

- `npx tsc --noEmit -p tsconfig.app.json`（apps/chat）：本次修改的 3 个文件无类型错误；仅存在与本次无关的既有语法错误 `src/components/conversation/autoChart/multi-measure-pie-chart.ts(72)`。
- 未运行 vitest：仓库现有测试集中在 `apps/abi/src/pages/workbench/ontology-kg/`，与本次改动无交集；本次改动以视图交互为主，无新增独立纯函数模块。
- 未做浏览器手工回归（需要后端 `recommend_chat_mode` 新返回结构的联调环境），建议联调时确认：
  1. 归因/预测按钮打开面板且默认句可直接发送；
  2. 自定义日期各粒度格式正确；
  3. 灯泡推荐问题列表与换一批不受影响。

## 风险 / 未解决事项

- 后端响应字段假设为 `data.metrics` / `data.dimensions` / `data.entities`（SemanticField 序列化后含 `name`/`label`），若字段名不同需微调 `getRecommend` 的取值。
- 预测时长预设（未来7天/30天/3个月/半年/1年）为前端定义，与后端 `FORECAST_TIME_TEMPLATES` 未逐字核对。
- 时间预设（最近7天/30天/3个月/半年/1年）同为前端定义，自定义时间可覆盖任意范围。

## 知识更新建议

- 无需更新 `.ai/context` 长期文档；本条为一次性交互改造，记录于本 run log 即可。
