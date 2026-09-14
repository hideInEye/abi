# Trust-ABI Frontend 框架级 Bug 清单与修复建议

## 文档状态

- 状态：分析完成，待逐项确认并排期修复。
- 日期：2026-09-10。
- 需求来源：全工程只读分析（apps/abi、apps/chat、apps/dashboard、packages/*）。
- 工程规模：1395 个源文件，约 19.5 万行代码，3 个应用 + 16 个共享包。

---

## 一、模块结构总览

### 应用层

| 应用 | 路径 | 技术栈 | 核心职责 |
|------|------|--------|----------|
| **abi** | `apps/abi` | React 18 + Redux Toolkit + Ant Design 5 + UnoCSS + Vite | 主业务管理端：登录、空间、数据准备、本体知识图谱、助手管理、系统管理、qiankun host |
| **chat** | `apps/chat` | React 18 + Zustand + TanStack Router + Tailwind + Vite | 聊天/问答子应用：SSE 流式对话、图表渲染、报告/探索模式、Widget 分享组件 |
| **dashboard** | `apps/dashboard` | React 18 + MobX + React Router + Less + Vite | 大屏设计器：画布拖拽缩放、Undo/Redo、蓝图编辑器、组件库、JSON Schema UI |

### 共享包层

| 包 | 路径 | 职责 |
|----|------|------|
| `@sa/auth` | `packages/auth` | token 标准化、Authorization header、登录过期/登出流程 |
| `@sa/axios` | `packages/axios` | axios 实例工厂、请求取消/重试/错误分层、flatRequest |
| `@sa/simple-router` | `packages/simple-router` | 基于 React Router 的路由创建、守卫、动态路由 patch |
| `@sa/hooks` | `packages/hooks` | useRequest、useTable、useBoolean 等共享 hooks |
| `@sa/materials` | `packages/materials` | AdminLayout、PageTab、SimpleScrollbar 等共享 UI |
| `@sa/color` | `packages/color` | 颜色算法 |
| `@sa/utils` | `packages/utils` | 通用工具函数、nanoid |
| `@sa/config` | `packages/config` | 共享 Vite/构建配置 |
| `@sa/ofetch` | `packages/ofetch` | fetch 封装（与 @sa/axios 功能重复） |
| `@sa/charts` | `packages/charts` | 图表组件（仅占位符，未实现） |
| `@sa/scripts` | `packages/scripts` | CLI 脚本（commit、release、router 生成） |
| `@sa/framework` | `packages/framework` | Reducer 工具 |
| `@sa/config-eslint` | `packages/config-eslint` | 共享 ESLint 配置 |
| `@sa/config-tailwind` | `packages/config-tailwind` | 共享 Tailwind 配置 |
| `@sa/config-tsconfig` | `packages/config-tsconfig` | 共享 TypeScript 配置 |
| `@sa/uno-preset` | `packages/uno-preset` | UnoCSS preset |

### 微前端集成

- **abi** 作为 qiankun **宿主**，加载 **chat**（端口 9100）和 **dashboard**（端口 5174）作为微应用
- 三应用通过 `localStorage` 共享 token（key: `SOY-REACT_token` / `token`）
- `window.onTokenExpired` 是宿主注入给子应用的统一登录过期回调

---

## 二、核心业务流程

### 2.1 登录 → 空间选择 → 主应用

```
main.tsx → setupApp() → setupRouter()
  → router.initReady() → guard/index.ts::init()
    → initConstantRoute()（本地静态路由）
    → checkAuthStatus()（读 localStorage token）
    → 未登录 → 重定向 /login
    → 已登录 → initAuthRoute()（调菜单接口 → 动态路由注册）
  → login 页：encrypt(pwd) → fetchLogin → 存 token/userInfo → initAuthRoute() → redirectFromLogin()
```

### 2.2 路由守卫 / 权限流程

```
createRouteGuard (beforeEach，每次导航执行):
  1. 白名单（login/not-found/403）→ 放行
  2. NProgress + page loading
  3. 404 路由：存在 → 403，不存在 → 保持 404
  4. Qiankun 模式 → 跳过鉴权
  5. constant 路由 → 直接放行
  6. 角色匹配 → 放行/403
```

### 2.3 对话消息发送/接收（chat 应用）

```
handleSend() → streamConvAnswer(SSE)
  → onmessage: choices[0].delta
    → reasoning_content → <think> 标签（深度思考）
    → content → 消息累积 → setCurrentMessage
  → [DONE] → 闭合思考 → SQL 查数 → 追加图表 view 消息
  → onerror → 重试（最多 2 次）
```

### 2.4 大屏设计器初始化

```
index.tsx → render() → loadAppConfig() → MainRouter → DesignerPage
  → EditorDesignerLoader.load()
    → scanComponents()：import.meta.glob 扫描 comps/**/*.ts
    → getProjectData()：API 获取项目 JSON
    → designerManager.init(data, EDIT)：分发到各 Manager
  → 渲染 FrameLayout(Header + Left + Canvas + Right + Footer)
```

### 2.5 请求层架构

```
abi:  request（baseURL）+ apiRequest（apiURL）+ chatRequest（chatURL）→ @sa/axios 的 createFlatRequest
chat: axios.create({ baseURL: '/' }) + Vite proxy → 自实现拦截器
dashboard: FetchUtil（自实现 fetch 封装）+ loadAppConfig()
```

---

## 三、致命 Bug（P0 — 建议立即修复）

### BUG-P0-01：ErrorBoundary 被注释，应用白屏风险

- **应用**：abi
- **文件**：`apps/abi/src/main.tsx:70-76`
- **现象**：React ErrorBoundary 被注释掉，任何组件渲染错误将导致整个应用白屏崩溃。
- **代码**：
  ```tsx
  // <ErrorBoundary fallbackRender={FallbackRender}>
    <Provider store={store}>
      <App />
    </Provider>
  // </ErrorBoundary>
  ```
- **影响**：生产环境任何未捕获的渲染错误 → 白屏，用户无法操作也无法看到错误信息。
- **修复建议**：恢复 ErrorBoundary 包裹，确保 FallbackRender 提供友好的错误页面和重试按钮。

### BUG-P0-02：登录密码明文存储到 localStorage

- **应用**：abi
- **文件**：`apps/abi/src/pages/login/index.tsx:39`
- **现象**："记住我"功能将密码明文写入 localStorage。
- **代码**：
  ```tsx
  localStorage.setItem('loginInfo', JSON.stringify({
    userName: params.username,
    passWord: params.password  // 明文密码！
  }))
  ```
- **影响**：任何能访问 localStorage 的 XSS 攻击或浏览器插件可获取用户明文密码。
- **修复建议**：仅存储用户名，不存储密码；或使用加密存储（已有 jsencrypt 工具）。

### BUG-P0-03：eval() 执行用户输入代码（XSS/代码注入）

- **应用**：dashboard
- **文件**：
  - `apps/dashboard/src/framework/core/AbstractDesignerController.ts:56,98`
  - `apps/dashboard/src/designer/blueprint/node/core/impl/logical-process/BPLogicalProcessNodeController.ts:42`
  - `apps/dashboard/src/designer/blueprint/node/core/impl/condition/BPConditionNodeController.ts:45`
  - `apps/dashboard/src/comps/common-component/data-config/database/DatabaseConfig.tsx:103`
  - `apps/dashboard/src/comps/common-component/data-config/api/ApiDataConfig.tsx:213`
  - `apps/dashboard/src/comps/map/AMapComponent.tsx:59`
  - `apps/dashboard/src/comps/antd/g2plot-custom/G2PlotCustomController.ts:35`
- **现象**：8 处使用 `eval()` 执行数据过滤器/蓝图处理器/自定义图表代码，代码来源为后端存储的 JS 函数字符串。
- **代码**：
  ```typescript
  const func = eval(`(${filter})`);
  this.handler = eval(`(${this.config.handler})`);
  ```
- **影响**：如果后端数据被篡改或存在注入，可在用户浏览器中执行任意 JavaScript 代码。
- **修复建议**：使用 `new Function()` 替代 `eval()`（至少隔离作用域），或在沙箱 iframe/Web Worker 中执行。长期方案：将 JS 函数替换为 JSON 配置的规则引擎。

### BUG-P0-04：登录页/其他页面访问时过期 token 触发菜单接口 401

- **应用**：abi
- **文件**：`apps/abi/src/router/guard/index.ts`
- **现象**：`init()` 函数中 `checkAuthStatus()` 只检查 token 是否存在，不验证有效性。过期 token 导致 `isLogin=true`，继续调用 `initAuthRoute()` → 菜单接口 → 401 → 弹"未授权访问"。
- **状态**：已通过 `isTokenExpired()` JWT 过期预检修复（2026-09-10）。
- **验证**：需确认所有场景（无 token / 过期 token / 有效 token × login 页 / home 页 / 分享页）均正常。

### BUG-P0-05：packages/config 生产环境 console.log(process.env) 泄露敏感信息

- **应用**：全局（packages）
- **文件**：`packages/config/src/index.ts:3`
- **现象**：`console.log(process.env)` 在生产构建中输出全部环境变量。
- **影响**：可能泄露 API 密钥、内部服务地址等敏感信息到浏览器控制台。
- **修复建议**：删除该行，或仅在 `import.meta.env.DEV` 条件下输出。

---

## 四、重要 Bug（P1 — 建议本迭代修复）

### BUG-P1-01：switchRouteByTab 中 action 未 dispatch

- **应用**：abi
- **文件**：`apps/abi/src/store/slice/tab/index.ts:222`
- **现象**：`setActiveTabId(tab.id)` 只创建 action 对象但未 dispatch，tab 切换后 activeTabId 状态不更新。
- **代码**：
  ```typescript
  async function switchRouteByTab(tab: App.Global.Tab) {
    const fail = await router.push(tab.fullPath);
    if (!fail) {
      setActiveTabId(tab.id);  // ← 未 dispatch！
    }
  }
  ```
- **修复建议**：改为 `dispatch(setActiveTabId(tab.id))`。

### BUG-P1-02：useConversationController 闭包陷阱

- **应用**：chat
- **文件**：`apps/chat/src/components/conversation/hooks/useConversationController.ts`
- **现象**：2211 行的巨型 Hook 中，`onclose`/`onerror` 回调不做 `requestToken` 校验，快速切换会话时旧请求的回调可能清空新会话状态。
- **代码**：
  ```typescript
  onclose() {
    setLoading(false)           // 无条件
    isRequesting.current = false // 无条件
    setConvContent(prev => ...)  // 无条件修改内容
  }
  ```
- **修复建议**：在 `onclose`/`onerror` 中增加 `requestToken` 校验，仅当 token 匹配当前会话时才更新状态。

### BUG-P1-03：WebSocket 调试连接无鉴权

- **应用**：chat
- **文件**：`apps/chat/src/components/conversation/hooks/useConversationController.ts`
- **现象**：WebSocket URL 未携带 token 参数或 header（浏览器 WebSocket API 不支持自定义 header），如果后端对 WS 连接做鉴权将失败。
- **代码**：
  ```typescript
  const url = `${normalizedBaseUrl}/ws-proxy/abi-debug/ws/stream/consume?convUid=${convUid}&roundIndex=${roundIndex}`
  wsRef.current = new WebSocket(url)
  ```
- **修复建议**：在 URL query 中传递 token 参数，如 `&token=${encodeURIComponent(token)}`。

### BUG-P1-04：ViewDesignerLoader mode 写死 EDIT

- **应用**：dashboard
- **文件**：`apps/dashboard/src/designer/loader/ViewDesignerLoader.ts:38`
- **现象**：`window.LC_ENV.mode` 写死为 `DesignerMode.EDIT`，而 `designerManager.init()` 传的是 `VIEW`，导致预览模式下组件容器模式判断出错。
- **修复建议**：将 `mode: DesignerMode.EDIT` 改为 `mode: DesignerMode.VIEW`。

### BUG-P1-05：AbstractDesignerController setInterval 未清理

- **应用**：dashboard
- **文件**：`apps/dashboard/src/framework/core/AbstractDesignerController.ts:74`
- **现象**：`this.interval = setInterval(...)` 创建轮询定时器，但 `destroy()` 方法未清除，组件销毁后定时器仍运行并持续发起 HTTP 请求。
- **修复建议**：在 `destroy()` 中增加 `clearInterval(this.interval)`。

### BUG-P1-06：setBackoff(true) 后未保证重置

- **应用**：dashboard
- **文件**：`apps/dashboard/src/designer/operate-provider/movable/DesignerMovable.tsx` + 各 RollbackImpl
- **现象**：撤销/重做中 `setBackoff(true)` 后通过 `Promise.resolve().then()` 触发 Moveable request。如果 request 未触发 `onDragEnd`（如元素已删除），`backoff` 永不重置，后续拖拽不记录历史。
- **修复建议**：增加 `setTimeout` 兜底重置，或在 `destroy()` 中强制重置。

### BUG-P1-07：Qiankun 卸载后全局单例 Store 未重置

- **应用**：dashboard
- **文件**：所有 Manager 和 Store（layerManager, eventOperateStore, historyOperator 等）
- **现象**：所有 Store 是模块级单例，Qiankun unmount 只卸载 React 树，单例 Store 中的状态全部残留。切回后显示上次残留数据。
- **修复建议**：在 Qiankun unmount 生命周期中调用各 Manager 的 reset 方法。

### BUG-P1-08：getOpeningText 死分支

- **应用**：chat
- **文件**：chat 应用配置函数
- **现象**：`state ? public : public` 两个分支返回值相同，`special` 和 `default` 配置永远不会被使用。
- **修复建议**：修正为 `state ? special : public` 或按业务逻辑选择正确的分支。

### BUG-P1-09：Redux Store 未被 Provider 挂载（死代码）

- **应用**：chat
- **文件**：`apps/chat/src/store/redux/`
- **现象**：`main.tsx` 中 Redux Provider 已被注释，但 `conversationsSlice` 和 `hooks.ts` 仍保留完整代码。如有组件通过 `useAppSelector`/`useAppDispatch` 访问 store 将因缺少 Provider 而报错。
- **修复建议**：明确删除整套 Redux 死代码，或恢复 Provider 挂载。

### BUG-P1-10：packages/axios abortControllerMap 内存泄漏

- **应用**：全局（packages）
- **文件**：`packages/axios/src/index.ts`
- **现象**：`abortControllerMap` 仅在被取消时 `delete`，正常完成的请求如果响应拦截器异常跳过清理，则 AbortController 永久残留。
- **修复建议**：在响应拦截器 finally 块中确保 `abortControllerMap.delete(requestId)`。

### BUG-P1-11：Nginx CORS 配置 Allow-Origin: * 与 Credentials: true 冲突

- **应用**：部署
- **文件**：`nginx/abi.conf`
- **现象**：`Access-Control-Allow-Origin: *` 与 `Access-Control-Allow-Credentials: true` 同时设置，浏览器规范禁止此组合，跨域请求将被浏览器拒绝。
- **修复建议**：将 `Allow-Origin` 改为动态回显请求的 `Origin` 头。

### BUG-P1-12：Vite 代理配置硬编码内网 IP

- **应用**：abi / chat
- **文件**：
  - `apps/abi/vite.config.ts:64,90`
  - `apps/chat/vite.config.ts:71`
  - `nginx/abi.conf`
- **现象**：`192.168.1.195` 硬编码在代理配置和 nginx 配置中，换环境后无法直接使用。
- **修复建议**：提取为 `.env.local` 变量（如 `VITE_PROXY_TARGET`），或统一使用环境变量。

---

## 五、中等 Bug（P2 — 建议纳入后续迭代）

### BUG-P2-01：路由守卫 loading 竞态

- **应用**：abi
- **文件**：`apps/abi/src/router/guard/index.ts:66-70`
- **现象**：`beforeEach` 和 `afterEach` 中使用动态 `import()` 加载 store 和 loading action，快速路由切换时 `hidePageLoading` 可能在 `showPageLoading` 之前执行。
- **修复建议**：改为静态 import 或使用 `requestAnimationFrame` 确保顺序。

### BUG-P2-02：performLogoutCleanup regex 过宽

- **应用**：abi
- **文件**：`apps/abi/src/store/slice/auth/index.ts:50`
- **现象**：`/globalTabs|token|userInfo|refreshToken|spaceId|spaceName|userId/i` 匹配所有含 "token" 的 key，可能误删非 auth 相关的 localStorage 条目（如 `myCustomTokenConfig`）。
- **修复建议**：改为精确匹配或前缀匹配（如 `^token$` 或 `^SOY-REACT_`）。

### BUG-P2-03：showErrorMsg errMsgStack 5 秒清空

- **应用**：abi
- **文件**：`apps/abi/src/service/request/shared.ts:24-33`
- **现象**：一条消息关闭后 5 秒会清空整个 errMsgStack，可能导致同时存在的其他错误消息被允许重复弹出。
- **修复建议**：改为从 stack 中移除该条消息，而非全量清空。

### BUG-P2-04：HistoryQueue size 可能变负

- **应用**：dashboard
- **文件**：`apps/dashboard/src/designer/operate-provider/undo-redo/HistoryQueue.ts:53-66`
- **现象**：回退后插入时 `this.size -= this.backCount`，极端情况 `backCount > size` 导致 `size` 为负数，`isEmpty()` 和 `isFull()` 判断错误。
- **修复建议**：增加 `Math.max(0, this.size - this.backCount)` 下限保护。

### BUG-P2-05：smLoading effect 逻辑反转

- **应用**：chat
- **文件**：chat 对话控制器
- **现象**：`useEffect` 在 `smLoading=true` 时写入 `smLoading=false`，语义反转可能导致 sub-message loading 状态卡住。
- **修复建议**：检查是否应为 `updateAiMessage({ smLoading })` 而非 `updateAiMessage({ smLoading: !smLoading })`。

### BUG-P2-06：handleShareEmail 缺少 catch

- **应用**：chat
- **文件**：chat 分享功能
- **现象**：`fetchShareEmail` 的 Promise 链缺少 catch，reject 时 `setConfirmShareLoading(false)` 不被调用，按钮永久 loading。
- **修复建议**：增加 `.catch(() => setConfirmShareLoading(false))`。

### BUG-P2-07：home 页 catch 中再次调用可能失败的 API

- **应用**：abi
- **文件**：`apps/abi/src/pages/home/index.tsx:58-62`
- **现象**：`catch` 块中再次调用 `fetchHomeData()`，首次失败后第二次大概率也会失败。
- **修复建议**：catch 中展示错误状态或空数据，不重试相同请求。

### BUG-P2-08：dashboard FetchUtil catch 块丢失错误信息

- **应用**：dashboard
- **文件**：`apps/dashboard/src/utils/FetchUtil.ts`
- **现象**：`catch (error: any)` 中 `response?.status ?? 500`，网络错误时 response 为 null，返回 code=500 但 msg 为空字符串，上层无法获取真实错误信息。
- **修复建议**：改为 `msg: error?.message || response?.statusText || '请求失败'`。

### BUG-P2-09：packages/simple-router 多守卫注册仅第一个生效

- **应用**：全局（packages）
- **文件**：`packages/simple-router/src/router.ts`
- **现象**：`beforeGuards.add()` 注册多个守卫时，仅第一个 beforeEach 被执行。
- **修复建议**：改为数组存储，依次执行所有注册的守卫。

### BUG-P2-10：三应用 auth.ts 大量重复代码

- **应用**：abi / chat / dashboard
- **文件**：
  - `apps/abi/src/utils/auth.ts`
  - `apps/chat/src/utils/auth.ts`
  - `apps/dashboard/src/utils/auth.ts`
- **现象**：chat 和 dashboard 的 `auth.ts` 约 95% 代码相同（`readAuthToken`、`clearAuthStorageOnly`、`handleLoginExpired`、`authManager` 创建），违反 DRY 原则。
- **修复建议**：将通用逻辑抽取到 `@sa/auth` 的工厂函数中，各应用只传入差异配置。

### BUG-P2-11：JSON.parse 无 try-catch 保护（多处）

- **应用**：abi / chat
- **文件**：
  - `apps/abi/src/pages/workbench/data-preparation/data-source/index.tsx:120-122`
  - `apps/chat/src/components/conversation/hooks/useConversationController.ts`（`handleCollect` 中）
- **现象**：`JSON.parse(record.configuration)` 和 `JSON.parse(userInfoString || '{}')` 在数据损坏时抛出未捕获异常。
- **修复建议**：统一用 `try-catch` 包裹，失败时回退默认值。

---

## 六、代码质量指标

| 指标 | 数量 | 风险等级 | 说明 |
|------|------|---------|------|
| `as any` 类型断言 | **397** | 🔴 高 | 大量绕过类型检查 |
| `eslint-disable` 注释 | **95** | 🟡 中 | 规则未被有效执行 |
| `console.log/warn/error` | **294** | 🟡 中 | 生产环境残留调试日志 |
| `@ts-ignore` / `@ts-nocheck` | **28** | 🟡 中 | 类型安全缺口 |
| `dangerouslySetInnerHTML` | **5** | 🟡 中 | 含 Markdown 渲染，需确保 sanitize |
| `eval()` | **8** | 🔴 高 | dashboard 数据过滤器/蓝图 |
| 空 `.catch(() => {})` | **13** | 🟡 中 | 静默吞掉错误 |
| `setTimeout`/`setInterval` | **75** | 🟡 中 | 多处用于时序 hack |
| 直接 `localStorage` 访问 | **140** | 🟡 中 | 应统一走 localStg 封装 |
| 测试文件 | **73** | 🟢 可 | 集中在 chat 和 abi ontology |

---

## 七、技术债总结

### 架构级

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | **useConversationController 巨型 Hook（2211 行）** | 🔴 | 集中了消息管理、流式接收、WebSocket、分享、删除等所有逻辑。建议拆分为 `useStreamReceiver`、`useShareActions`、`useHistoryLoader`、`useDebugSocket` |
| 2 | **路由系统多层补丁** | 🟡 | `mergeHiddenChildRoutes`、`appendSubAppWhiteRoutes`、`patchMissingHiddenRoutes` 等函数说明路由注册有根本性不足 |
| 3 | **3 个并行请求实例** | 🟡 | abi 中 request/apiRequest/chatRequest 的 `isBackendSuccess` 逻辑相似但不一致 |
| 4 | **全局单例泛滥（dashboard）** | 🟡 | 所有 Manager/Store 是模块级单例，不支持多实例，Qiankun 卸载后不重置 |
| 5 | **图层双向链表手动指针维护** | 🟡 | 1000+ 行链表操作代码，删除/复制/编组/排序均需手动维护 prev/next/childHeader/childTail |

### 代码级

| # | 问题 | 说明 |
|---|------|------|
| 6 | **Redux + Zustand + MobX 三套状态管理跨应用共存** | 增加认知负担和包体积 |
| 7 | **Widget 与主对话大量重复代码** | `parseAiRaw`、`wrapInlineThinking` 等高度相似但独立实现 |
| 8 | **setTimeout 时序 hack 广泛使用** | 至少 6+ 处用 0/1/10ms 等待 DOM 渲染 |
| 9 | **文件命名拼写错误** | `pulg.ts`（应为 plugin）、`compoent-lib`（应为 component-lib）、`filter-lilst`（应为 filter-list） |
| 10 | **@sa/ofetch 与 @sa/axios 功能重复** | 两个 HTTP 客户端共存 |
| 11 | **@sa/charts 未实现** | 仅占位符，无实际功能 |

---

## 八、修复优先级排期建议

### P0（立即修复，预计 1-2 天）

| Bug | 修复工作量 | 影响范围 |
|-----|-----------|---------|
| P0-01 ErrorBoundary 恢复 | 小 | 全局稳定性 |
| P0-02 密码明文存储 | 小 | 安全 |
| P0-03 eval() 替换为 new Function | 中 | 安全 |
| P0-04 登录页菜单接口（已修复） | — | 登录体验 |
| P0-05 console.log(process.env) 删除 | 极小 | 安全 |

### P1（本迭代修复，预计 3-5 天）

| Bug | 修复工作量 | 影响范围 |
|-----|-----------|---------|
| P1-01 switchRouteByTab dispatch | 极小 | Tab 切换 |
| P1-02 onclose requestToken 校验 | 中 | 对话切换稳定性 |
| P1-03 WebSocket 鉴权 | 小 | 调试功能 |
| P1-04 ViewDesignerLoader mode | 极小 | 大屏预览 |
| P1-05 setInterval 清理 | 极小 | 内存泄漏 |
| P1-06 setBackoff 重置 | 小 | Undo/Redo |
| P1-07 Qiankun Store 重置 | 中 | 微前端切换 |
| P1-08 getOpeningText 死分支 | 极小 | 开场引导 |
| P1-09 Redux 死代码清理 | 小 | 代码整洁 |
| P1-10 abortControllerMap 泄漏 | 小 | 请求层 |
| P1-11 Nginx CORS 修复 | 小 | 跨域请求 |
| P1-12 硬编码 IP 提取 | 小 | 部署灵活性 |

### P2（后续迭代，按需排期）

| Bug | 修复工作量 | 影响范围 |
|-----|-----------|---------|
| P2-01 ~ P2-11 | 各 0.5-2 天 | 各模块稳定性和代码质量 |

---

## 九、后续建议

1. **补充核心流程测试**：`useConversationController`（2200+ 行最复杂逻辑无测试）、登录流程、路由守卫、请求层。
2. **统一请求层**：将 abi 的 3 个请求实例合并，统一 `isBackendSuccess` 判定逻辑。
3. **抽取共享 auth 模块**：将 chat/dashboard 重复的 `auth.ts` 逻辑抽取到 `@sa/auth`。
4. **dashboard eval() 长期方案**：将 JS 函数字符串替换为 JSON 配置的规则引擎或 Web Worker 沙箱。
5. **清理死代码**：Redux 死代码、被注释的大段代码、备份文件（`role-auth copy.tsx`）、拼写错误文件名。
