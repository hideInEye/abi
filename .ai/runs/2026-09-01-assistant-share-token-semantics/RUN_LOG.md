# 2026-09-01 助手分享页：临时 token 鉴权 + schemaSemantics 语义解析

## 需求

1. 分享校验接口 `checkSharePassword` 验证通过后后端下发临时 `token`，分享页后续所有接口调用携带该 token 鉴权。
2. 分享助手查询 `getProjectInfo/{type}/{id}` 返回结果顶层 `schemaSemantics` 存数据语义（每项 `schemaConfig` 为 JSON 字符串），语义下拉从该字段取数。

## 修改

- `apps/chat/src/components/chat-widget/service.ts`
  - `WidgetConfig` / `ShareCheckResult` 增加 `token` 字段；`checkSharePassword` 透传后端 `data.token`。
  - 新增 `buildHeaders`：有 token 时以 `Authorization: Bearer <token>` 携带（与主应用鉴权头同格式）；`postJson` / `getJson` / `sendChatStream` 统一接入。
  - `mapProjectSemantics`：优先取详情顶层非空 `schemaSemantics`（版本化场景回退 version 下）；`schemaConfig` 兼容数组与 JSON 字符串两种形态（新增 `toSchemaConfigList` 解析）。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`
  - 新增 `verifiedToken` prop 与 `shareToken` state，注入 `cfg.token`。
  - `load(id, type, tokenOverride?)`：校验刚返回的 token 未写入 state 时本轮接口用覆盖配置携带；`loadChartForMessage` 增加 `cfgOverride` 参数供历史消息回填图表复用。
  - 内部探测/密码校验通过后 `setShareToken(res.token)` 并透传给 `load`。
- `apps/chat/src/pages/assistant-share-page/$shareCode.tsx`
  - 探测与密码校验通过后捕获 `d.token` 存入 `verifiedToken`，随 `verifiedAppId` 一并传给 `ChatWidget`。
- `apps/chat/src/components/chat-widget/service.test.ts`
  - 新增用例：顶层 `schemaSemantics` 且 `schemaConfig` 为 JSON 字符串时正确解析。

## 验证

- `npx vitest run apps/chat/src/components/chat-widget/service.test.ts`：12 个用例全部通过（含 3 个既有用例，数组形态/版本选取行为不变）。
- `npx tsc -p tsconfig.app.json --noEmit`：改动文件无错误；仅存 `conversation/autoChart/multi-measure-pie-chart.ts` 既有报错（git 确认本次未改动）。

## 风险

- token 携带方式按主应用约定取 `Authorization: Bearer`；若后端联调时要求其他头/参数，仅需调整 `buildHeaders` 一处。
- 无 token（后端未下发）时请求头与改动前完全一致，行为等价。

## 长期文档

- 无需更新 `.ai/context/`、`.ai/prompts/` 等；分享链路接口约定已集中在 `service.ts` 注释中。

## 补充（2026-09-01 晚些）：分享建会话补传 spaceId

- 现象：`/abi-chat/v1/app/session/add` 分享场景只传 `appId/title/groupId/shareCode`，缺空间 id（主对话 `createApp` 会传 `spaceId`）。
- 修改：`fetchAssistantInfo` 从 `getProjectInfo` 详情提取 `spaceId`（兼容 `space_id`）存入 `WidgetAssistantInfo`；`ensureSession(cfg, appId, spaceId?)` 有值时随 body 下发；`ChatWidget` 的 `load` 与 `handleSend` 两个建会话调用点透传 `assistantInfo?.spaceId` / `info?.spaceId`。后端未下发 spaceId 时不传该字段，行为与改动前等价。

## 补充（2026-09-01 再次）：分享建会话补传 userId

- 现象：`session/add` 报「用户ID不能为空」。
- 修改：`ensureSession` 增加 `userId: getCurrentUserId()`，取数口径同主对话/大屏（`SOY-REACT_userInfo.userId` → `userId` → 0），分享免登录无登录态时落 0，与 `sendChatStream` 的 `user_id: 0` 一致。

## 补充（2026-09-01 三次）：completions context 补必填字段

- 现象：`chat/completions` 报 `body.context.embed_model_id / chat_model_id / space_id: Field required`。
- 修改：`sendChatStream` 的 context 补 `chat_model_id: 12`、`embed_model_id: 6`（同大屏 AiChatPanel 默认值）、`space_id`（新增 `spaceId` 参数，`ChatWidget.handleSend` 透传 `info?.spaceId`，非法/缺失落 0）。

## 补充（2026-09-01 四次）：分享面板视觉对齐主对话 + 补齐图表/复制

- 现象：分享面板样式与主对话割裂（蓝底白字气泡、灰底 AI 卡、顶部状态条），且缺图表/复制能力。
- 修改（仅 `ChatWidget.tsx` + `index.css`，不改接口协议）：
  - 视觉对齐主对话 glassmorphism 主题：浅薰衣草画布 + 白色内容卡（`#e9edf4` 边/轻阴影/16px 圆角）；用户气泡改浅薰衣草渐变 + 深色文字（同 `HumanEle`）；主题色 `#1677ff` 全量替换为 `#5b7cf7/#8b5cf6`；Markdown 标题加蓝色左条（同「描述分析/图表信息」小节头）。
  - 思考面板重做（同 `AiEle` thinkingCard）：圆形图标（流中紫色 spinner / 完成绿色对勾）+ 紫色「思考中/已完成思考」+ 秒数 + 右侧展开/收起；移除顶部全局状态条。
  - 开场白对齐 `OpeningsEle`：机器人头像 + 浅蓝气泡（含小三角）+ 编号推荐问题（3 个一批 + 换一批），点击直接发起对话（`handleSend` 增加 `explicitText` 参数）。
  - 反馈行补复制按钮（复制/点赞/点踩，同主对话反馈区）：`copyText` 优先 Clipboard API、非安全上下文降级 `execCommand`，成功后短暂绿色高亮。
  - 图表：切换条移至图表上方（同主对话工具栏位置）+ 「图表信息」小节头；`loadChartForMessage` 增加直连降级——尾部 JSON 自带非空 `data` 数组时直接渲染（无需 sql/dbName），否则仍走 `db/query` 查数。
- 验证：`tsc --noEmit -p tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 既有报错（历史遗留、本次未改动），改动文件无类型错误。
- 风险：纯展示层改动；图表直连 `json.data` 为新增降级路径，后端不下发 `data` 时行为与改动前一致。

## 补充（2026-09-01 五次）：AI 消息改为单张白色大卡（结构对齐主对话）

- 现象：上一轮思考条与正文仍是两张独立小块，与主对话「一张白卡内嵌思考条 + 内容」的结构不一致。
- 修改：新增 `.abi-cw-ai-card` 白色大卡容器（20px 圆角/#e9edf4 边/轻阴影），思考条（`width:100%` 占满卡宽）、正文、图表区、复制/点赞/点踩反馈行全部置于同一卡内；`.abi-cw-msg-ai-body` 与 `.abi-cw-chart` 去除嵌套卡片边框，仅保留排版。
- 验证：`tsc --noEmit` 仅存既有报错，改动文件无类型错误。

## 补充（2026-09-01 六次）：渲染层整体复用主对话组件 + 裸 JSON 回复解析修复

- 现象：1) 开场白/用户气泡/思考卡/反馈行仍为自绘，与主对话不一致；2) 流式期间残留「正在生成...」裸文本；3) 消息上下时间戳多余；4) 该助手后端回复为 `{"thought": ...}` 裸 JSON 且字符串值内含字面换行（非法 JSON），`JSON.parse` 失败导致思考内容原样刷入正文、图表 json 取不到。
- 修改：
  - ChatWidget 渲染层整体复用主对话组件：开场白 `OpeningsEle`、用户气泡 `HumanEle`、思考卡 `AiEle`（thought 重新包回 `<think>` 传入）、白卡容器类同 MessageList bodyCard、正文 `convStyles['markdown-content']`、图表区 `ChartHeader` + 图/表/SQL 三视图、反馈行 `StatisticsAnalysis`（chat_with_analysis 仅复制/点赞/点踩）；删除全部自绘欢迎/思考/反馈样式与「正在生成...」回退、消息时间戳。
  - service.ts `parseAiRaw` 增加宽容解析：严格 `JSON.parse` 失败时按字段正则提取 thought/answer/sql/type/title/data（容忍值内字面换行）；thought 归入思考卡；结构化 JSON 不进入正文；流式未闭合 JSON 块也不闪现正文；`finalizeStreamText` 收敛为 `parseAiRaw(raw).text`。
- 验证：`vitest run service.test.ts` 13/13 通过（新增伪 JSON 用例）；`tsc --noEmit` 仅存 `multi-measure-pie-chart.ts` 既有报错。

## 补充（2026-09-02 七次）：思考完成态对齐主对话（思考卡 + 图表恢复）

- 现象：思考完成后只剩描述分析正文，顶部思考卡（AiEle）与底部图表/表格/SQL 均不展示。
- 根因（对齐主对话 useConversationController 管线逐项排查出的缺口）：
  1. `sendChatStream` 完全忽略 `delta.reasoning_content`（主对话把它包成 `<think>` 流式展示），思考内容丢失 → 完成态 `m.thinking` 为空 → AiEle 不渲染；且 `enable_thinking: false` 与主对话深度思考开启态不一致，后端可能根本不下发思考。
  2. 后端可能把思考直接内联在 content 中用 Markdown 标题标记边界（`## 1. 🧠 思考过程` … `## 3. 🔧 查询模式`，主对话 `processContentWithInlineThinking` 负责包装），widget 未处理 → 无 `<think>` 段可提取。
  3. 知识模式 content 为 ```json 围栏包裹、以 `thoughts`（复数）为首字段的 JSON（主对话 `extractKnowledgeThoughts`），widget 只找 `thought` 且不剥围栏。
  4. 正文白名单缺 `desc` / `data_knowledge`（ViewEle 正文口径），desc 型回复取不到正文。
  5. 历史链路：`mapShareHistory` 把 `view` 消息整个过滤掉，而后端异步生成的图表数据恰恰存在 view 消息里 → 刷新后历史 AI 消息永远没图表。
- 修改：
  - service.ts `sendChatStream`：`extra_body.enable_thinking` 改 `true`（对齐主对话深度思考开启态，分享页思考卡常显）；onmessage 处理 `reasoning_content`（首个 reasoning chunk 前插 `<think>`、`reasoning === null` 时闭合，同主对话）；content 前缀去重（后端可能重发全量前缀）；`finalize` 对未闭合推理段补 `</think>`。
  - service.ts `parseAiRaw`：新增 `wrapInlineThinking`（全文把内联思考标记段包装为 `<think>`，流式未闭合段整体归入思考、正文不闪现）；剥离 ```json 围栏；`thoughts`/`desc`/`data_knowledge` 纳入思考与正文提取；新增 `findTrailingJsonBlock`（同主对话 `extractTrailingJson` 的平衡块 + 严格解析策略，正文含 `{` 代码片段时不再被贪婪正则吞掉），非法 JSON 仍回退贪婪匹配 + 宽容提取；`extractJsonStringField` 不再要求闭合引号，流式中值未完整时也能增量提取。
  - history.ts `mapShareHistory`：保留 `view` 消息，`parseViewChart` 解析其 content（JSON 字符串或 `<chart-view content="..."/>` 包裹，`'describe'` 视为无图表）后挂到最近一条 ai 消息。
  - ChatWidget.tsx `load`：历史 ai 已带 view 图表时按白名单校正 `type` 并免重查；仅 sql 无结果行或无 view 图表时回退 ai 内容尾部 JSON（同主对话主动查数）。
- 验证：`vitest run service.test.ts` 17/17 通过（新增内联思考段闭合/未闭合、围栏 thoughts JSON、正文含 `{` 代码片段 4 个用例）；`tsc --noEmit -p tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 既有报错。

## 补充（2026-09-02 八次）：退化分享流解析修复 + 流结束后历史回补（对齐主对话完成态）

- 现象：分享流返回大量内容但完成态只展示「无数据返回」；主对话同问题展示思考卡 + 描述分析正文 + 饼图。
- 根因（对照用户抓包的原始 SSE 逐 chunk 还原）：
  1. 该分享流为模型原始退化输出：文首泄漏未闭合 JSON 头 `{\n  "thought` + 变体内联标记 `## 1. 💡 分析思路` … `## 2. 🔧 查询模式`（主对话正则为 🧠/3. 不识别）+ 尾部重复碎片，全文不含 sql/data。
  2. `parseAiRaw` 因文首 `{` 进入「整段即 JSON」分支，宽容提取失败后把正文 slice 为空 → 落「无数据返回」兜底。
  3. 图二的思考卡/正文/饼图数据源是后端异步落库的 ai（thoughts JSON）与 view（desc + 结果行）消息，流里根本没有 → 必须走历史回补。
- 修改：
  - service.ts：THINK 正则扩展变体（`💡 分析思路` 开始 / `## 2.` 结束）；`wrapInlineThinking` 对标记前括号不平衡的未闭合 JSON 头整段丢弃；整段 `{` 开头且提取不到字段时保留原文（不再清空正文）。
  - history.ts：`WidgetChart`/`parseViewChart` 新增 `desc`（view 消息正文字段，同主对话 ViewEle 口径）。
  - ChatWidget.tsx：新增 `backfillFromHistory`——onDone 后轮询 `message/query`（最多 4 次、间隔 1.2s，以发送前 ai 消息数判定本轮是否落库，避免误补上一轮），按主对话历史口径回补 thinking/正文（ai thoughts 或 view desc）/图表（view 结果行免重查，仅 sql 回退查数）；`load` 历史正文同样回退 view desc。
- 验证：`vitest run service.test.ts` 19/19 通过（新增变体标记 + 未闭合 JSON 头丢弃、整段 `{` 保留原文 2 个用例）；`tsc --noEmit -p tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 既有报错。

## 补充（2026-09-02 九次）：回补改走主对话同款 messages/search（按轮次取 view 消息）

- 现象/反馈：主对话完成态的 view 上下文（desc/图表数据）来自 `messages/search?key=view&page=1&page_size=1&message_role=view`（ViewEle fetchData 按 `round_index` 调用），widget 之前用 message/query 全量轮询回补，未对齐。
- 修改：
  - service.ts 新增 `fetchViewContextByRound`（同 ViewEle fetchData 的接口与参数：query 固定 key/view/page/page_size/message_role，body 传 conv_uid + round_index），返回 `data.items[0].context`。
  - ChatWidget.tsx：删除 `backfillFromHistory`（message/query 全量轮询）及发送前 ai 计数；onDone 取到 roundIndex 后调 `backfillFromView`（最多 4 次、间隔 1.2s 应对后端异步落库），view 上下文经 `parseViewChart` 解析后回补正文（desc）与图表（结果行免重查，仅 sql 回退查数）；仅 desc 无结果行无 sql 的 view 不渲染图表卡。
  - history.ts：`parseViewChart` 导出供回补复用；desc 口径对齐 ViewEle（chat_with_knowledge 取 data_knowledge 其余取 desc）；仅 desc 无 rows/sql 时也返回（正文回补需要）。
- 验证：`vitest run service.test.ts` 19/19 通过；`tsc --noEmit -p tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 既有报错。

## 补充（2026-09-02 十次）：search 未发出的根因（onDone 双发 + 轮次为 null 即中断）与轮次兜底

- 现象：网络面板仅 query/completions/max×2，无 messages/search。
- 根因：
  1. `sendChatStream` 的 `[DONE]` 与服务端关流 `onclose` 各触发一次 `finalize` → onDone 双发（max×2 的来源）。
  2. onDone 里 `fetchMaxRound` 返回 null 时直接 return，回补链路中断 → search 永不调用（分享上下文轮次接口可能不可用）。
- 修改：
  - service.ts：`finalize` 加 `done` 重入守卫（收尾仅一次）；新增 `fetchLastRoundIndex`（message/query 分组结构末组 `roundIndex`，同主对话历史接口结构，轮次接口不可用时的兜底）。
  - ChatWidget.tsx：`backfillFromView` 轮次三级解析（流结束 hint → 补查 max → message/query 末组），onDone 不再因 round 为 null 中断回补。
- 验证：`vitest run service.test.ts` 19/19 通过；`tsc --noEmit -p tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 既有报错。

## 补充（2026-09-02 十一次）：实时对话调用链与渲染对齐主对话（收敛重复请求）

- 现象/反馈：分享页实时对话「一下调用好几次」且渲染与主对话割裂。抓包：`completions` 后 `max / max / query / search?key=view&page=1… / max / query / search… / max / query / search…` 循环重复；流式期间正文闪现未闭合 JSON、`round_index:` / `sub_chat_mode:` 标记泄漏进正文、思考卡无「思考了 X 秒」。
- 根因（对照主对话 `useConversationController` [DONE] 管线逐条排查）：
  1. 十次引入的 `backfillFromView` 4 轮重试：`roundHint` 为 null 时每轮都 `max + message/query + search` 三连，叠成请求洪水。
  2. onDone 无条件先 `fetchMaxRound` 一次，即使流内 content 已带 `round_index` 占位串（主对话是流内提取优先、缺失才补查一次 max）。
  3. view 上下文仅带 sql（无结果行）时再触发一次 `db/query`，与主对话「有 sql 主动查数即置 arrowStatus、ViewEle 不再 search」口径不一致，形成二次查数。
  4. `load()` 历史链路对每条 ai 消息逐条 `db/query` 重查图表，主对话历史是直接用 view 消息自带结果行、不重查 sql。
  5. 渲染层流式期间直接渲染原始流文本正文（`stripHtmlTags` + `\{[^{}]*$` 补丁），主对话流中只挂 ai 思考消息（AiEle smLoading），正文在 [DONE] 后由 view 挂载；且缺 `thinkTime`、未剥离流内占位标记。
- 修改（对齐主对话 [DONE] 管线，废弃十次的重试/兜底路径）：
  - history.ts：`WidgetMessage` 新增 `thinkTime?: number`（仅 AI，发送到 [DONE] 的耗时秒，同主对话口径）。
  - service.ts：新增 `stripStreamMarkers`（剥离 `round_index:\d+` / `sub_chat_mode:\w+` 占位串）并应用于 `parseAiRaw` 返回的 thinking 与 text，防标记泄漏；删除 `fetchLastRoundIndex`（十次兜底、已无调用点的死代码）。
  - ChatWidget.tsx：
    - `load()`：删除历史逐条 `db/query` 重查块，仅保留 enrichment（`parseAiRaw` 解析 thinking/正文、view 挂来的图表按白名单校正类型、无正文回退 view desc）。
    - `loadChartForMessage(json, dbName?)`：签名简化（去掉 index/cfgOverride），优先直连 `json.data` 结果行、否则 `db/query` 查数一次。
    - `backfillFromView(session, round)`：改为单次不重试（同主对话 ViewEle fetchData），`round == null` 直接不搜。
    - `handleSend`：流内优先提取 `round_index`（`streamRound`）；`startTime` → onDone 计算 `thinkTime`；`resolveRound`（流内提取优先，缺失才补查一次 `fetchMaxRound`）；有 sql/结果行走 `loadChartForMessage` 主动查数（不再搜 view），无则 `resolveRound().then(backfillFromView)` 单次回补。
    - 渲染层：流中 `displayText` 恒为 `''`（不闪未闭合 JSON），AiEle 传 `thinkTime`；[DONE] 后正文取 `parseAiRaw` 文本 / view desc。
- 收敛后单条消息最坏调用链：`max×0-1 + (db/query×1 | search×1)`，与主对话完全同口径（流内提取到 round_index 时 max 也省掉）。
- 验证：`npx vitest run apps/chat/src/components/chat-widget` 3 文件 31/31 通过；`npx tsc --noEmit -p apps/chat/tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 3 条既有报错（`.ts` 内 JSX，git 确认本次未改动），chat-widget 零错误。
- 风险：废弃十次的 4 轮重试后，若后端 view 上下文异步落库晚于 [DONE]，单次 search 可能取不到本轮 view（回退展示流内解析正文/图表，不再重复轰炸接口）；窄面板样式与上一会话未提交改动（exploration-mode、service.test.ts）均未触碰。

## 补充（2026-09-02 十二次）：修复 isOk 信封误判导致 max 后链路全断（无 search/无描述分析/无图表）

- 现象/反馈：实时对话只发 `completions + max` 两个请求就停住，无 `search`/`db/query`，不渲染描述分析与图表；思考卡外残留 `chat_with_db_execute` 碎片 + `## N. 🔧 查询模式` 等退化流文本。对照正常 chat：同一 `max` 返回 `{success:true, err_code:null, err_msg:null, data:26}` 后会继续调 `search?key=view…`。
- 根因：widget `isOk` 只认 `Number(json.code)===200`，而 chat-proxy 系（max/db/query/search）响应信封为 `{success, err_code, err_msg, data}`（**无 code 字段**）→ `isOk` 恒 false → `fetchMaxRound` 返回 null → `backfillFromView` early-return → search/图表全断；正文因此停留在流内退化文本。主对话对同类响应的成功判定为 `res?.success===true || Number(res?.code)===200`（ViewEle / useConversationController 同口径）。
- 修改：
  - service.ts `isOk`：改为 `json?.success === true || Number(json?.code) === 200`（兼容双信封，超集不破坏 code:200 系接口）。
  - ChatWidget.tsx `backfillFromView`：返回 `Promise<boolean>`（是否回补到 content/chart）。
  - ChatWidget.tsx `onDone`：正文不随流结束立即落（先 `content:''` 清空流内退化文本）；hasSql/hasRows 分支落 `finalText`；describe 分支等 `backfillFromView` 回补 view desc，**未回补到任何内容**才回退 `finalText`（同主对话正文来自 view，退化流文本不覆盖 desc）。
- 效果：max 正确得 26 → 继续 `search` 回补 desc+图表；思考卡外不再闪现退化流文本。
- 验证：`npx vitest run apps/chat/src/components/chat-widget` 31/31 通过；`npx tsc --noEmit -p apps/chat/tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 3 条既有报错。
- 风险：`isOk` 放宽为超集，对原本 `success:false` 的业务错误仍判失败（`success===false` 且无 code:200），行为安全。

## 补充（2026-09-02 十三次）：分享面板窄屏样式对齐主对话（思考紧凑/描述分析小节/图表按钮收敛）

- 反馈：思考文字偏大不适小屏；描述分析与思考卡太紧且缺「描述分析」标题；思考打字机需限高；图表工具栏只要前三个视图按钮。
- 修改：
  - conversation/index.module.css：新增 `.thinkingContentCompact` / `.thinkingStepContentCompact`（12px/1.7，限高 `var(--think-max-h, 300px)`），不改主对话默认。
  - conversation/AiEle.tsx：新增 `compact?: boolean`（默认 false），紧凑态应用于流式思考区与折叠历史步骤；主对话不传不受影响。
  - conversation/components/ChartHeader.tsx：新增 `hideTools?: boolean`（默认 false），为 true 时隐藏配置/调试/大屏/导出/筛选，仅留图/表/SQL 三个视图切换；主对话不传不受影响。
  - chat-widget/ChatWidget.tsx：AiEle 传 `compact`、ChartHeader 传 `hideTools`；描述分析正文前补 `section-header` + `chart-header-title`「描述分析」小节头（同 ViewEle 蓝色左条）并加 `mt-2` 与思考卡拉开间距。
  - chat-widget/index.css：`.abi-cw-root` 设 `--think-max-h: 8.5em`（≈5 行，em 相对思考区 12px/1.7）。
- 验证：`npx tsc --noEmit -p apps/chat/tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 3 条既有报错；ChartHeader 既有 implicit-any 为 IDE 更严配置历史问题（项目 typecheck 不报），未做无关重构。
- 限高行数经与用户确认为「约 4-5 行」。

## 补充（2026-09-02 十四次）：描述分析取空回退退化文本的修复（search 有限重试）+ 窄面板字号/尺寸收尾

- 现象/反馈：描述分析正文仍是 `chat_with_db_execute…` 退化流文本（非 view desc）；思考打字机字号未生效；描述分析正文偏大；面板宽高需再加大。
- 根因：
  1. 十一次为收敛请求把 `backfillFromView` 改成单次不重试，但后端 view 消息异步落库常晚于 [DONE]，单次 search 取空 → `parseViewChart` 返回 null → 回退流内退化文本（正是十三次风险栏预告的场景）。
  2. 打字机字号未生效：紧凑态只设在 `.thinkingContent` 容器上，内层 `.markdown-content` 自带字号覆盖继承。
- 修改：
  - ChatWidget.tsx `backfillFromView`：search 有限重试（最多 3 次、间隔 700ms，取到 view 即停）；保留用户改动「仅回补到 desc 才算 filled」与 `handleStop` 主动收尾。
  - ChatWidget.tsx 描述分析正文容器：加 `abi-cw-desc` class + 内联 `fontSize:13px/lineHeight:1.75`（内联压过 markdown-content 容器字号）。
  - conversation/index.module.css：紧凑态补 `.thinkingContentCompact/.thinkingStepContentCompact` 下 `.markdown-content` 及 p/li/h1-h6 的 12px/1.7 后代覆盖（修打字机字号）。
  - chat-widget/index.css：`.abi-cw-desc` 下 h1-h6 降为 14px、code/pre 12px；面板尺寸页内 480×720→520×780、悬浮 440→480（保留 max-width/max-height 视口守卫）。
- 验证：`npx vitest run apps/chat/src/components/chat-widget` 31/31 通过；`npx tsc --noEmit -p apps/chat/tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 3 条既有报错。
- 风险：重试仅在 round 有效且首次取空时发生，最坏 search×3（有界），不会复现十次的请求洪水；用户本轮对 ChatWidget/index.css 的手改（filled 口径、handleStop 收尾、human 气泡宽度、面板初版加大）均已保留。

## 补充（2026-09-02 十五次）：描述分析 desc 取错源修复（chart-view 前缀文本口径）+ response_table 默认表格视图

- 现象/反馈：描述分析仍是退化流文本；用户贴出 search 原始响应：view 的 `context` 为「描述段落 + `\n<chart-view content="{…}" />`」，描述在标签**外的前缀文本**，标签内 JSON 无 `desc` 字段。
- 根因：widget `parseViewChart` 只读标签内 JSON 的 `desc`/`data_knowledge`，而主对话口径（utils `parseContext` L80-81）是「`<chart-view` 之前的前缀文本即 desc」→ widget 永远取空 desc → `backfillFromView` 返回 false → onDone 回退流内退化文本（图表却正常，与截图吻合）。
- 修改：
  - history.ts `parseViewChart`：desc 优先取 chart-view 标签前前缀文本（trim），无标签/无前缀时兜底 JSON desc/data_knowledge；新增 `tableView` 标记（json.type === 'response_table'）。
  - ChatWidget.tsx：`ChartCard` 初始 activeType 按 `chart.tableView` 默认 'table'（同主对话 ViewEle L367-371 response_table → setActiveType('table')）；`loadChartForMessage` 组装 chart 时同步打 `tableView` 标记；backfill 经 `{...view, type}` 自动携带。
  - history.test.ts：新增 parseViewChart 3 个用例（前缀 desc + response_table tableView / JSON desc 兜底 / describe 与空内容 null）。
- 验证：`npx vitest run apps/chat/src/components/chat-widget` 34/34 通过（新增 3 用例）；`npx tsc --noEmit -p apps/chat/tsconfig.app.json` 仅存 `multi-measure-pie-chart.ts` 3 条既有报错。
- 风险：前缀为空串时行为与旧版一致（回退 JSON desc）；`tableView` 为可选字段，主对话与历史链路不传不受影响。

## 补充（2026-09-02 十六次）：图表限高 + 信息条（分组/数据语义）+ 思考收起与数据同帧落定

- 反馈：图表太高；顶部要展示数据语义组与语义（同主对话信息条样式）；思考完到数据展示之间有 2-3s 空窗（思考先收起、只剩思考卡+点赞栏），要求同主对话「等数据到位后思考收起与正文同帧展示」。
- 修改：
  - ChatWidget.tsx `ChartCard`：EChart 高度 25rem → 16rem（窄面板）。
  - 信息条：history.ts `WidgetChart`/`WidgetMessage` 新增 `semanticGroup`/`semanticName`；`parseViewChart` 从 view JSON 的 `semantic_group_name`/`semantic_name` 提取；新增 `semanticMetaOf(json)` 供查数 JSON 复用；发送时 ai 占位消息即盖当前选中语义（信息条随发送即显），历史 enrichment / backfill / loadChartForMessage 三路回补；AI 白卡顶部渲染信息条（复刻主对话 MessageList L563-652 样式，分享场景不可点 schema），样式落 index.css `.abi-cw-infobar*`。
  - 落定时序：onDone 不再立即 `streaming:false`，仅落 thinking/thinkTime；新增 `settle(patch)` 收口（streaming 置 false 与正文同一次 patch）；hasSql/hasRows 分支等 `loadChartForMessage` 完成后 settle，describe 分支等 backfill 完成后 settle；渲染层图表卡加 `!m.streaming` 门禁（desc/反馈栏原本已门禁）→ 思考卡保持展开直到数据到位，随后同帧收起+展示正文/图表。
- 验证：`npx vitest run apps/chat/src/components/chat-widget` 34/34 通过；`npx tsc --noEmit -p apps/chat/tsconfig.app.json` chat-widget 零错误（仅存 multi-measure-pie-chart.ts 3 条既有报错）。
- 风险：handleStop/onError 仍立即 streaming:false（用户主动停止/异常不等数据）；settle 空 patch 仅置 streaming，不会覆盖 backfill 已落内容。
