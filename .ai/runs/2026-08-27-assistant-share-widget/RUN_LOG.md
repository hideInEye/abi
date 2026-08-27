# 助手分享页与第三方嵌入对话悬浮框（Web Component，方案3）Run Log

## 基本信息

- 日期：2026-08-27
- 任务名称：assistant-share-widget
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-08-27 追加章节）
- 执行 AI：Qoder
- 任务类型：新功能

## 需求摘要

助手可外链分享（后端传路径、前端跳转，复刻大屏分享链路），页面为悬浮对话面板形态；悬浮框抽为纯组件，经独立 Vite lib 构建产出 Web Component（外部 JS/CSS），支持第三方系统嵌入。

## 影响范围

- `apps/chat/src/components/chat-widget/`（新增）
- `apps/chat/src/pages/assistant-share-page/$shareCode.tsx`（新增）
- `apps/chat/src/widget-entry.tsx`、`apps/chat/vite.config.widget.ts`（新增）
- `apps/chat/package.json`（新增 `build:widget` 脚本）
- `apps/chat/src/service/api/assistant.ts`（新增 shareAssistant/checkAssistantShare）
- `apps/chat/src/pages/chat/workshop/index.tsx`（助手卡片新增分享按钮）
- `apps/chat/src/routeTree.gen.ts`（构建期自动生成新路由）

## 修改文件

见影响范围。未修改现有对话主流程、报告/探索模式、大屏 AiChatPanel、大屏分享、部署配置。

## 实现说明

- 一个组件两种形态：`ChatWidget`（props 驱动：shareCode/apiBase/mode/verifiedAppId/onClose），分享页渲染 `mode="page"`，Web Component 渲染 `mode="float"`。
- 分享链路复刻大屏：后端返回下划线 `assistant_share_page/{code}`，`shareUrl.ts` 转 `/assistant-share-page/{code}`；分享页先 `checkAssistantShare(shareCode, '')` 探测密码，有密码弹 antd Modal（文案交互同大屏 ShareViewPage），通过后以 `verifiedAppId` 渲染 widget。
- 嵌入形态自带内置密码表单（不依赖 antd），`<abi-chat-widget share-code api-base>` 自定义元素 + `window.AbiChatWidget.mount/unmount` 兜底。
- 与计划的两处实现级细化（不改变目标/验收）：
  1. widget 最终未引入 antd（自绘 UI + `abi-cw-` 前缀 CSS），因此无需 ConfigProvider prefixCls/getPopupContainer，隔离更彻底、体积更小（js gzip 149KB）。
  2. 密码交互按形态分布：分享页 antd Modal、嵌入形态内置表单，避免在 widget 内引入 antd。
- 免登录：`chat-widget/service.ts` 裸 fetch 附 shareCode，不读 token/localStorage；接口路径假设集中文件顶部 `API` 常量，后端联调仅改一处。
- 样式隔离：不用 Shadow DOM；widget CSS 全量 `abi-cw-` 前缀；widget 构建不挂 Tailwind/tanstackRouter/svg-icons 插件。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/chat/src/components/chat-widget`
- `pnpm exec vitest run`（全量）
- `pnpm --filter ai-bot build`
- `pnpm --filter ai-bot build:widget`
- `pnpm --filter ai-bot exec tsc -b`
- `git diff --check`

### 测试结果

- 新增测试 10/10 通过（shareUrl 5、history 5）。
- 全量 Vitest：217 通过；1 个既有 suite 失败（`apps/chat/src/service/api/app.test.ts`，根 vitest 未配 `@` alias 导致解析失败，与本次改动无关，git 确认该文件与 `utils/index.ts` 均未修改）。
- `ai-bot build` 成功；routeTree.gen.ts 已生成 `/assistant-share-page/$shareCode`。
- `build:widget` 成功：`dist/widget/abi-chat-widget.js` 481.75KB（gzip 149.18KB）、`abi-chat-widget.css` 4.68KB（gzip 1.39KB）。
- `tsc -b` 无新增错误（既有错误：`autoChart/multi-measure-pie-chart.ts` 语法错误、主 `vite.config.ts` 未使用参数，均与本次无关）。
- `git diff --check` 通过。

### 失败和修复过程

- 初版 service.ts 含冗余透传 helper `API_CHECK_CFG`，自查后删除。
- `tsc -b` 生成 `tsconfig.*.tsbuildinfo` 产物，已删除保持工作区干净。

## 回归检查

- 现有对话/报告/探索模块未改动；workshop 仅新增分享按钮与两个 import。
- 主应用构建产物与构建流程不变（仅新增独立 widget 构建入口）。

## Review 结果

- 组件无 store/Tailwind/antd 依赖，满足双形态复用约束。
- StrictMode 重挂载以 `didInit` ref 守卫，避免重复建会话。
- 后端接口未就绪：service 层集中 URL 与响应解包，联调风险可控。

## 发现的问题

- 根 vitest 无 `@` alias 配置，chat 内经 `@/` 导入的既有测试（app.test.ts）在根全量运行失败——既有问题，建议后续单独处理。
- 仓库 `nginx/` 配置非实际部署依据（用户确认），本任务未涉及任何部署配置。

## 本轮经验

- 悬浮框类可嵌入组件应保持“零 UI 库依赖 + 前缀 CSS”，比 Shadow DOM 更适配 antd 生态外的宿主页面。
- 分享链路“后端下划线/前端连字符”约定可在 chat 与 dashboard 间复用。

## 是否需要更新 AI 系统

### 需要更新的 context

- 已更新 `.ai/context/MODULE_MAP.md`（apps/chat 增加 chat-widget/widget 构建说明）。

### 需要更新的 prompts / agents / skills / MCP / checklists

- 暂不需要。

### 需要更新的 decisions

- 建议后续补 ADR：助手分享集成方案选型（方案3 Web Component，不用 Shadow DOM 的原因）。

## 后续建议

- 后端接口就绪后联调：`/abi-chat/v1/app/share`、`checkSharePassword`、会话三件套免登录 + CORS。
- widget 图表渲染（view 消息）按需懒加载纳入后续迭代。
- 手动验收清单：分享页直开 / 有密码 / 第三方空白页嵌入 / 宿主样式无污染。

## 未解决问题

- 后端分享接口协议已于 2026-08-27 确认并落地（见文末追加章节）；会话三件套免登录与 completions 的 shareCode 支持仍待确认。
- 嵌入形态在宿主页面全局样式极强时的表现需真实第三方页面验证。
- widget 对话 chat_mode 当前假设 `chat_with_assistant_share`，需后端确认免登录分享对话的实际模式。

## 2026-08-27 追加：对话能力对齐助手对话（SSE 流式）

### 背景

用户要求分享页/嵌入悬浮框支持对话，且与助手对话一致。调研确认助手对话走 `fetchEventSource` + `/chat-proxy/api/v2/workflow/chat/completions`（OpenAI 兼容增量 + `[DONE]`），widget 初版非流式 `sendChat` 升级为流式。

### 修改文件

- `chat-widget/service.ts`：删除非流式 `sendChat`，新增 `sendChatStream`（fetchEventSource，stream/incremental/model/context 参数对齐 useConversationController，shareCode 随 body 下发）、`finalizeStreamText`（think 段剥离 + 尾部 task_type JSON 提取）。
- `chat-widget/ChatWidget.tsx`：逐字流式渲染（光标 + “正在生成...”占位）、发送中切换“停止生成”按钮（AbortController）、卸载时中断流。
- `chat-widget/history.ts`：WidgetMessage 增加 `streaming?` 字段。
- `chat-widget/index.css`：新增 `abi-cw-stop`、`abi-cw-cursor` 样式。
- `chat-widget/service.test.ts`：新增 finalizeStreamText 4 例。

### 验证

- `pnpm exec vitest run apps/chat/src/components/chat-widget`：14/14 通过。
- `pnpm --filter ai-bot build` 成功；`build:widget` 成功（js 486KB/gzip 151KB，fetch-event-source 已打入）。
- `tsc -b` 过滤 chat-widget 无错误。
- 追加修改后重验：15/15 通过（新增连字符兼容用例）、`build:widget` 成功、`ai-bot build` 成功、`tsc -b` 过滤相关文件无错误。

## 2026-08-27 追加：后端分享接口协议落地（/api/v1/project/share，type 区分）

### 协议（用户确认）

分享接口助手与大屏共用，后端服务路径 `/api/v1/project/share`，新增 `type` 字段：chat 端助手分享=`react`、abi 助手=`workflow`、数据大屏=`dashboard`；请求体 `{ projectId, spaceId, type, sharePasswordFlag, expirationDays }`。分享校验同大屏，请求体 `{ shareCode, sharePassword }`，响应含 `projectId`（=助手 appId）。

### 网关路径修正（重要）

首次落地误把 url 写成 `/api/v1/project/share`，与 `baseURL=VITE_BASE_API('/api')` 拼接后实际请求 `/api/api/v1/...`，接口不通。核对大屏实际拼接（`VITE_API_TARGET='/api'` + `/dashboard/api/v1/project/share`）后修正为 `/dashboard/api/v1/project/share`（网关完整路径 `/api/dashboard/api/v1/project/share`）；widget 内 `checkShare` 同步修正，且请求体字段由 `password` 改为与大屏一致的 `sharePassword`。

### 修改文件

- `service/api/assistant.ts`：`shareAssistant` / `checkAssistantShare` 改调统一分享接口（`SHARE_BASE_URL = '/dashboard/api/v1/project'`，shareAssistant 自动注入 `type: 'react'`，入参 projectId=appId、spaceId、sharePasswordFlag、expirationDays）。
- `pages/chat/workshop/index.tsx`：分享入口改传 `projectId + spaceId(getSpaceId())`。
- `chat-widget/service.ts`：widget 校验路径对齐统一接口（`/dashboard/api/v1/project/checkSharePassword`），字段改 `sharePassword`；`checkSharePassword` 响应 appId 取值兼容 `d.appId ?? d.projectId`。
- `pages/assistant-share-page/$shareCode.tsx`：同上兼容 `projectId`。
- `chat-widget/shareUrl.ts`：后端返回路径标识兼容下划线/连字符两种格式（`assistant[_-]share[_-]page`）；shareUrl.test.ts 新增连字符用例。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：需求章节追加“后端协议确认”小节。

## 2026-08-27 追加：真实入口修正（apps/abi 宿主应用弹窗接入）

### 问题

用户实际使用的助手工坊入口在 **apps/abi（宿主应用，chatbi 包）**，其 `pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx` 的 `handleShare` 仍是 TODO 占位（`message.info('助手分享功能待后端接口就绪')`）。此前几轮修复都落在 apps/chat 的 workshop，未覆盖真实入口，导致页面仍提示“待后端接口就绪”。

### 修改

- `apps/abi/src/service/api/share.ts`：新增 `shareProjectApi`，POST `/api/dashboard/api/v1/project/share`（apiRequest 全路径约定，dev 由 `/api` proxy 转发 192.168.1.195），入参 `{ projectId, spaceId, type, sharePasswordFlag, expirationDays?, expirationDate? }`。
- `apps/abi/.../my-assistant/AssistantShareModal.tsx`：`handleShare` 真正调用 `shareProjectApi`（`type:'workflow'`（abi 助手）、`projectId=agent.id`、`spaceId` 取自 `getSpaceId` store）；有效期 Segmented（1/7/30）映射 `expirationDays`，自定义映射 `expirationDate`（`YYYY-MM-DD HH:mm:ss`）；成功后 `shareUrl` 中 `assistant_share_page` 转 `assistant-share-page` 展示/复制，`sharePassword` 一并展示；失败 `message.error`。
- 三入口 type 对齐（用户明确的协议）：chat 端助手分享=`react`（apps/chat `assistant.ts` 已注入）、abi 助手=`workflow`（apps/abi 弹窗）、数据大屏=`dashboard`（apps/dashboard `BaseApi.shareProject` body 补 `type: 'dashboard'`，覆盖 MyScreenItem / ProjectItem 两个调用点）。

### 验证

- `pnpm --filter chatbi typecheck` 过滤 `AssistantShareModal|api/share` 无错误（其余为既有无关错误）。
- 实测路径：abi 应用 → 应用工坊 → 我的助手 → 分享 → 生成分享链接，Network 应见 `POST /api/dashboard/api/v1/project/share`（type=react）。

## 2026-08-27 追加：后端 shareUrl 实际格式对齐（dashboard_share_page 统一标识）

### 问题（用户实测反馈）

后端三种 type 返回的 shareUrl 统一使用 `dashboard_share_page` 标识：
- abi 助手（workflow）：`{origin}/#/dashboard_share_page/{code}`（哈希）→ abi 为 history 路由，哈希被忽略跳回主页；
- 大屏（dashboard）：`{origin}/dashboard_share_page/{code}`（history 下划线）→ abi/dashboard 只有连字符路由 → 404；
- chat 助手（react）：`https://192.168.1.195/#/dashboard_share_page/{code}` → chat 侧 `parseShareCode` 只认 `assistant_share_page` 标识 → 误报“获取分享链接失败”。

### 修改

- `apps/chat/.../shareUrl.ts`：标识正则放宽为 `(?:assistant|dashboard)[_-]share[_-]page`；shareUrl.test.ts 新增 dashboard 标识用例（16/16 通过）。
- `apps/abi/.../AssistantShareModal.tsx`：提取 shareCode 后拼 `${origin}/chat-ui/#/assistant-share-page/{code}` 作为分享链接（chat 分享页匿名可访问）。
- `apps/abi/src/router/routes/index.ts`：新增下划线别名路由 `/dashboard_share_page/:shareCode`，复用 `layout.blank$view.dashboard-share-page` 视图（嵌大屏微应用），修复大屏下划线链接 404。
- `apps/abi/src/main.tsx`：独立运行且 `location.hash` 匹配 `#/dashboard_share_page/{code}` 时，重定向到 `/chat-ui/#/assistant-share-page/{code}`，使后端返回的哈希链接可直接打开（qiankun 子应用模式不生效，避免误跳宿主）。
- `apps/dashboard/src/router/MainRouter.tsx`：新增 `/dashboard_share_page/:shareCode` 别名路由 → ShareViewPage。
- `apps/dashboard` GroupLayer / ComponentContainer：`isSharePage` 判断补充下划线路径。
- 用户澄清：后端 shareUrl 的 host 固定为网关地址，本地测试时由用户自行把路径粘到前端地址后；大屏两个弹窗保持展示后端原 URL（host 重写改动已撤回）。chat 工坊与 abi 弹窗按 `location.origin` 拼接。

### 验证

- `vitest run apps/chat/src/components/chat-widget`：16/16 通过。
- 预期：chat 工坊分享不再误报并复制可用链接；abi 弹窗链接指向 `{origin}/chat-ui/#/assistant-share-page/{code}`；abi 应用 history 下划线路由 `/dashboard_share_page/{code}` 渲染大屏分享页；哈希路径 `#/dashboard_share_page/{code}` 重定向到 chat 分享页。

## 2026-08-27 追加：chat 工坊分享改为同 abi 样式弹窗

### 修改

- 新增 `apps/chat/src/pages/chat/workshop/AssistantShareModal.tsx`：UI 与 abi 应用「分享助手」弹窗完全一致（访问密码保护 Switch / 链接有效期 Segmented 永久·1/7/30/自定义+DatePicker / 生成分享链接 / 结果区展示链接+密码+复制）；接口走 `shareAssistant`（type=react），链接经 `convertShareUrl` 转 chat 分享页 hash 路由。
- `workshop/index.tsx`：分享按钮改为打开弹窗（`shareAgent` state），移除原先直接调接口复制的旧逻辑。
- `service/api/assistant.ts`：`shareAssistant` 入参补充 `expirationDate`（自定义过期）。

### 验证

- `tsc -b` 过滤 workshop/AssistantShareModal 无错误（既有无关错误不变）。

## 2026-08-27 追加：弹窗被 codegen 覆盖 + abi 别名路由名修复

### 问题

- chat 弹窗组件原放在 `src/pages/chat/workshop/AssistantShareModal.tsx`，被 TanStack 文件路由 codegen 覆盖为路由占位文件（无 default export，报 `does not provide an export named 'default'`）。
- abi 下划线别名路由 name 原为 `dashboard_share_page`，elegant-router 转换时用下划线作路由名层级分隔符（`isFirstLevelRoute`），含下划线被判为多级路由走错分支 → 路由不生效仍 404。

### 修改

- 弹窗组件移至 `apps/chat/src/components/AssistantShareModal.tsx`（pages 目录外），删除占位文件；workshop import 改 `@/components/AssistantShareModal`。
- abi 别名路由 name 改 `dashboard-share-page-alias`（path 仍为 `/dashboard_share_page/:shareCode`）。
- 用户要求去掉本地 origin 拼接逻辑：abi / chat 两个助手分享弹窗均改为直接展示后端返回的 shareUrl（与大屏弹窗一致），host 由使用方自行替换。

## 2026-08-27 追加：chat 支持下划线哈希路径

后端 shareUrl 统一为 `{host}/#/dashboard_share_page/{code}`。各端消费：

- chat 新增路由 `src/pages/dashboard_share_page/$shareCode.tsx`（beforeLoad redirect 到 `/assistant-share-page/$shareCode`），支持 `{origin}/chat-ui/#/dashboard_share_page/{code}`；routeTree.gen.ts 由 codegen 自动注册。
- abi 已有 main.tsx 哈希 shim（`{origin}/#/dashboard_share_page/{code}` → `/chat-ui/#/assistant-share-page/{code}`）与 history 别名路由（`/dashboard_share_page/:shareCode`）。

## 2026-08-27 追加：URL 保持后端路径（不重定向改写）

用户反馈页面路径被自动改写、不按后端路径。改为直接在后端路径上渲染：

- `assistant-share-page/$shareCode.tsx` 视图抽出为 `AssistantSharePageView({ shareCode })` 导出。
- `dashboard_share_page/$shareCode.tsx` 去掉 redirect，直接渲染 `AssistantSharePageView`，URL 保持 `#/dashboard_share_page/{code}` 不变。
- abi main.tsx shim 重定向目标改 `/chat-ui/#/dashboard_share_page/{code}`（跨应用跳转不可避免，但路径段保持后端标识）。
- 用户反馈 location.replace 跳转有 404 闪屏且地址栏多出 /chat-ui。shim 改为**不跳转**：独立运行检测到 `#/dashboard_share_page/{code}` 时全屏 iframe 内嵌 chat 分享页，地址栏保持后端原路径，不走 abi 路由。

## 2026-08-27 追加：分享页面板改悬浮可拖拽

用户要求分享页对话框悬浮、可拖、变小：

- `index.css` 形态 A 从整页居中大面板（760px 宽、满高）改悬浮小卡片：fixed 右上，420px 宽、640px 高（max-height 视口约束），带阴影。
- `ChatWidget.tsx` 头部加拖拽（pointer 事件，首次拖拽切换为显式 left/top，边界钳制；按钮上不触发），两种形态通用；头部 cursor:move。

## 2026-08-27 追加：免登录排查

- abi init 守卫原先未登录无条件跳 login（不看 meta.constant），对 `/dashboard_share_page/` 与 `/dashboard-share-page/` 分享路径放行——**正式改动，保留**。
- 三端 `utils/auth.ts` 的 `redirectToLogin` 临时屏蔽跳登录（仅 console.warn），供用户排查哪个接口返 401——**临时调试，排查完恢复**。已按用户要求恢复原逻辑。

