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
