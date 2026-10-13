# Run Log: 分享接口适配（下线访客密码校验 + getProjectInfo 探测入口 + shareListByApiKey）

- 日期：2026-10-12
- 需求：`.ai/requirements/CURRENT_REQUIREMENT.md` 2026-10-12 追加「分享接口适配」
- 类型：接口适配 + 访客侧密码校验下线 + 新增接口接入

## 背景

后端调整分享相关接口（附 3 张接口文档）：

1. `saveShareTheme` 上送体改为 `{shareCode, uiConfig}`，`uiConfig` 为主题 UI 配置 JSON 字符串，整串覆盖。
2. 分享页查询入口改为 `getProjectInfo/{type}?shareCode=xxx`（type 路径变量：dashboard/react/workflow），后端据 shareCode 换出项目/助手 id，路径不再带 `{id}` 段。
3. 新增 `shareListByApiKey`（按 API-Key 查绑定的分享列表，type 可选过滤）。
4. 用户明确「`checkSharePassword` 去掉，不需要了」「密码功能已下线」——删除全部访客侧密码弹窗/校验流程，`getProjectInfo` 作为分享页唯一入口。

## 用户决策（AskUserQuestion 确认）

- 分享入口：密码功能已下线，`getProjectInfo` 直接返回项目信息/token/主题，无门禁。
- type 来源：「先写吧，等会给你看返回」→ 先按前端顺序探测（workflow→react），待后端返回结构再校准。
- `shareListByApiKey`：apiKey 作查询参数（`?apiKey=xxx&type=`），并接入 API-Key 页「助手列表」抽屉，替换原全量拉取 + 前端过滤。

## 修改文件

### chat-sdk 树（@abi/chat-widget，含主题功能）

- `apps/chat-sdk/src/chat/components/chat-widget/service.ts`：`saveShareTheme` 改上送 `{shareCode, uiConfig:JSON.stringify(...)}`；新增 `ShareProjectInfo`/`SHARE_PROBE_TYPES`；`getProjectInfo` 路径去 `{id}`、改 `?shareCode=`；删 `checkShare`/`checkSharePassword`；`fetchAssistantInfo`→`fetchShareProjectInfo`（探测式，返回带 token）。
- `apps/chat-sdk/src/chat/components/chat-widget/ChatWidget.tsx`：去密码流（删 password state/`handlePasswordSubmit`/密码渲染分支/`'password'` Phase/verified* props），改 `getProjectInfo/{type}` 探测启动。
- `apps/chat-sdk/src/chat/components/chat-widget/index.css`：删 `.abi-cw-password*` 死规则（-34 行）。
- `apps/chat-sdk/src/chat/service/api/assistant.ts`：删 `checkAssistantShare`。

### chat 树（ai-bot，chat-sdk/src/chat 的物理副本，无主题）

- `apps/chat/src/components/chat-widget/service.ts`：镜像同步（无 `saveShareTheme`/theme 分支）。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：镜像同步去密码流 + 探测启动。
- `apps/chat/src/components/chat-widget/index.css`：删 `.abi-cw-password*` 死规则（-34 行）。
- `apps/chat/src/components/chat-widget/AssistantSharePanel.tsx`：由 150 行密码 Modal 逻辑重写为薄封装（仅按 embed 决定铺满 iframe / 整页面板），apiBase 用 `String(window.APP_CONFIG?.VITE_BASE_API ?? '')`。
- `apps/chat/src/service/api/assistant.ts`：删 `checkAssistantShare`。

### dashboard 树（abi-dashboard）

- `apps/dashboard/src/api/BaseApi.ts`：删 `checkSharePassword`；新增免登录变体 `getShareProjectInfo(type, shareCode)`（`X-Skip-Auth`）。保留登录态 `getProjectInfo(id, type)`（按 id，核心流程依赖）。
- `apps/dashboard/src/pages/share/ShareViewPage.tsx`：删密码 Modal/`handlePasswordSubmit`/相关 state 与 antd 引入；init 改用 `getShareProjectInfo('dashboard', shareCode)` 解析 projectId；删 `setShareInfo` 调用。
- `apps/dashboard/src/designer/loader/ShareDesignerLoader.ts`：删死字段 `shareCode`/`sharePassword` 与 `setShareInfo` 方法（消除 TS6133）。

### abi 树（chatbi）

- `apps/abi/src/service/api/share.ts`：新增 `fetchShareListByApiKeyApi({apiKey, type?})`（GET，params 传参）。保留 `fetchProjectShareListApi`（`syncShareAppStatus` 内部使用）。
- `apps/abi/src/pages/component/applications/api-key/components/ShareAssistantDrawer.tsx`：改用 `fetchShareListByApiKeyApi`；删前端 `parseApiKeys` 过滤；pid 加 `appId` 兜底、name 加 `r?.appName` 兜底。

## 验证

- 逐 app `tsc`：本次改动的文件按文件名过滤零类型错误。各 app 剩余为 pre-existing 报错：
  - chat：`autoChart/multi-measure-pie-chart.ts`（.ts 却含 JSX，3 语法错误，与本任务无关）。
  - chat-sdk：`@/` 别名解析 + unused 等既有报错，改动文件零错误。
  - dashboard：dayjs / HomeMenus 等既有报错，改动文件零错误。
  - abi：其余既有报错，改动文件零错误。
- 定向 vitest：`npx vitest run apps/chat/src/components/chat-widget` → 4 文件 46 用例全部通过（service/history/scrollFollow/shareUrl，均为纯函数，未受本次改动影响）。chat-sdk 树无测试副本。
- grep 确认 `checkSharePassword`/`checkShare`/`checkAssistantShare`/`fetchAssistantInfo`/`.abi-cw-password` 全库零残留。
- widget 产物：`@abi/chat-widget` 的 `dist` 已在根 `.gitignore`（line 3），仓库无提交产物，随部署 `vite build` 从源码重建，无需手工重建。

## 风险与遗留

- **创建侧密码功能与访客侧不一致（需用户确认）**：dashboard「创建分享」侧仍保留 `sharePasswordFlag` 开关、`BaseApi.shareProject`、`getSharePassword`、分享记录列表——即创建分享时仍可设密码，但访客端已无密码校验门禁。此能力不在本次 3 个接口文档范围内，故保留未动；若用户希望一并下线创建侧 toggle，属更大的独立改动。
- **type 探测顺序待校准**：`SHARE_PROBE_TYPES = ['workflow','react']` 为占位实现，需后端返回结构确认后校准（用户「等会给你看返回」）。
- 未运行浏览器联调（本地未起后端），入口探测、token 携带、主题读取均为代码级回归检查。

## 同日追加：分享页全接口附加 API-Key 头（x-api-key / secrectKey）

用户追加：助手分享页（chat-sdk）的**所有**接口都要带 `x-api-key` 与 `secrectKey` 两个请求头（头名按后端拼写，secrectKey 保持原样）；密钥由第三方在平台「API Key」页创建后自行注入接入配置。

- 新增 `apps/chat-sdk/src/chat/service/request/share-api-key.ts`：模块级密钥上下文 `setShareApiKey(apiKey, secretKey)` / `shareApiKeyHeaders()`；未配置返回空对象，登录态/主对话请求头不变。
- 四个请求出口统一合并 `shareApiKeyHeaders()`：
  - `chat-widget/service.ts` `buildHeaders`（裸 fetch + sendChatStream SSE）。
  - `service/request/index.ts` axios 请求拦截器（探索/报告/助手非流式接口）。
  - `service/api/conv.ts` `streamExplorePlan`（探索 SSE）。
  - `service/api/report.ts` `getAuthorizationHeaders`（报告 submit/status/Redis Stream SSE 共用）。
- 注入链路：`element.ts` observedAttributes 增 `api-key`/`secret-key` → `AbiAssistant` props → `ChatWidget` props → 挂载 effect（先于 initCheck）调 `setShareApiKey`，保证首个入口接口起即带密钥头。
- 验证：chat-sdk `tsc` 改动文件零新增错误（剩余为 pre-existing 别名/`window.APP_CONFIG`/废弃 stub）；`vitest run apps/chat-sdk` 22 用例通过。
- 安全提示（已告知用户）：客户端注入意味着 secretKey 会出现在页面源码/网络面板，仅适合只读、可吊销的分享密钥；若需保密应改由第三方后端代理注入或服务端换发短时效 token。

## 同日追加：widget 头部助手切换列表（shareListByApiKey）

用户追加：`shareListByApiKey` 返回的助手列表要在悬浮窗**头部标题处**支持切换（仅 chat-sdk，因该能力依赖 x-api-key 头，chat 树无密钥上下文故不镜像）。

- `chat-widget/service.ts`：新增 `API.shareListByApiKey`、`WidgetShareItem`、`shareCodeFromShareUrl`（兼容四种分享路径）、`fetchShareListByApiKey(cfg, type)`（密钥随头、type 传 `SHARE_PROBE_TYPES[0]`=react、按 shareCode 去重）。
- `ChatWidget.tsx` 拆外层/面板：原组件改名 `ChatWidgetPanel`（新增 `assistants`/`onSwitchAssistant` props）；新增外层 `ChatWidget` 持有 `currentShareCode` + `assistants`，拉取列表并以 `key={currentShareCode}` 重挂载面板完成切换时的状态整体重置。
- 头部标题在 `assistants.length>1` 时升级为 antd `Dropdown` 切换按钮（复用 `abi-cw-menu` 面板样式，当前项打勾）；新增 `switchOpen` state 与 `.abi-cw-header-switch/.abi-cw-switch-caret/.abi-cw-switch-name` CSS。
- 验证：chat-sdk `tsc` 改动文件零新增错误；`vitest run apps/chat-sdk` 22 用例通过。
- 遗留：切换列表项的 shareCode 依赖后端返回 `shareCode` 或可解析的 `shareUrl`；若两者都缺则该助手不会出现在列表。

## 同日追加：识别分享下发的预设主题 + 移除访客本地存储

用户提供 `getProjectInfo/react?shareCode=vcg33zmd` 真实返回：`data.uiConfig` 为 JSON 字符串 `{"theme":"dark"}`，**预设主题藏在 uiConfig 内**而非顶层 `data.theme`；原实现只读顶层 `d.theme`，故 ABI 分享时三选一的主题识别不到。另要求接口已就绪，去掉访客本地存储逻辑。

- `chat-widget/service.ts` `fetchShareProjectInfo`：先解析一次 `uiObj = toUiConfigObject(d.uiConfig ?? d.themeConfig)`，预设主题取 `d.theme` → `uiObj.theme` 回退链，命中才 `normalizeThemeId`，两者皆无保持 undefined（回退接入属性/默认蓝）；`themeConfig` 仍走 `normalizeThemeConfig(uiObj)`，`{"theme":"dark"}` 无 UI 字段故返回 undefined，不会污染自定义层。
- `ChatWidget.tsx` 移除主题本地持久化：删 `THEME_STORAGE_KEY`/`THEME_CONFIG_STORAGE_KEY`/`loadStoredThemeConfig` 及随之失效的 `normalizeThemeConfig` 导入；`customConfig`/`userTheme` 初始为 null；`handlePresetChange`/`handleThemeConfigChange`/`handleResetTheme` 不再读写 localStorage，自定义仅本次会话生效，跨刷新以「保存」→ `saveShareTheme` 后的后端下发为准；保存失败提示由「已保留在本地」改为「请重试」。
- 主题优先级变为：预设基准 < 宿主注入（theme 属性/initialThemeConfig）< 接口下发（apiTheme/apiThemeConfig）< 访客本次会话改动。
- 该返回未带 `token` 字段，入口后请求仅靠 `x-api-key`/`secrectKey` 头鉴权，`Authorization` 保持可选，无需改动。
- 验证：chat-sdk `tsc` 改动文件零新增错误；`vitest run apps/chat-sdk` 22 用例通过；全库 grep `abi-assistant-theme`/`loadStoredThemeConfig` 零残留（chat 树无主题功能，无需镜像）。

## 同日追加：按真实返回修复头部切换列表（shares 信封 + 去掉 type 过滤）

用户提供 `shareListByApiKey` 真实返回：`data` 为 `{ total: 2, shares: [{ shareCode, type, name }] }`。原实现只认 `records/rows/list`，`shares` 落空 → 列表恒为空 → `canSwitchAssistant` 为 false，头部既无下拉也无切换样式。

- `chat-widget/service.ts` `fetchShareListByApiKey`：解析链补 `d.shares`（置于 records/rows/list 之前），信封默认值由 `[]` 改 `{}`；**去掉 type 查询参数**——同一 `shareCode=vcg33zmd` 在列表里标 `type: workflow`，而入口按 `react` 才返回数据，列表 type 与实际可用入口类型不一致，按它过滤会误伤，故列全量绑定分享。
- `ChatWidget.tsx`：调用处去掉 type 实参；新增 `duplicateAssistantNames`（useMemo 统计重名），下拉项在重名时附 `shareCode` 尾注——实测两个分享同名「新建助手」，仅靠勾选无法区分。
- `index.css`：新增 `.abi-cw-switch-code`（不收缩、11px、opacity .55、`var(--mono)` 等宽），继承菜单项文字色以适配三套主题。
- 头部标题去掉 `智能问答` 兜底（用户反馈切换瞬间会闪该文案）：新增 `headerTitle = info?.name || 切换列表同 shareCode 名 || ''`，切换重挂载的 checking 期直接显示目标助手名，无名时仅显示 `AI`；下拉按钮与静态 span 两个分支同改。
- 下拉过宽与拖拽失效同源修复（用户反馈「选中的框太长，有时没法拖动悬浮框」）：`button.abi-cw-header-switch` 继承 `.abi-cw-header-name` 的 `flex: 1` 被撑成整行宽，antd 浮层按触发器宽度撑满整行，且 `handleDragStart` 的 `closest('button')` 排除规则吞掉几乎整个头部拖拽区；改为 `flex: 0 1 auto; min-width: 0; max-width: 70%`，标题文本包进 `.abi-cw-switch-label` 单独省略、caret 保持可见；浮层根 `.abi-cw-menu` 另加 `max-width: min(320px, calc(100% - 16px))` 封顶。静态 span 分支仍 `flex: 1`（非 button，不影响拖拽）。
- 间距回退修正（用户反馈「不是原来的间距了」）：头部为 `justify-content: space-between`，按钮收缩后剩余空间被均分把 logo/标题/按钮拉散；新增 `.abi-cw-header-title` 占位容器（`flex: 1; min-width: 0; display: flex`）包裹下拉按钮与静态 span 两个分支，由容器吸收剩余空间恢复原间距，容器空白处仍命中拖拽。
- 验证：chat-sdk `tsc` chat-widget 零错误；`vitest run` 22 用例通过。
- 遗留：入口仍单类型 `SHARE_PROBE_TYPES = ['react']`；若切换到的分享实为 workflow/dashboard 项目，react 探测拿不到 appId 会落到「获取分享信息失败」。是否恢复 `['react','workflow']` 兜底（首请求仍是 react）待用户联调 wzxf8nui 后决定。

## 是否需要更新 .ai/ 长期文档

- `context/`：暂不需要（未引入新架构约定）。
- `decisions/`：建议记录「访客侧密码校验下线、getProjectInfo 作为分享页唯一入口」这一决策，便于后续区分创建侧密码能力。
