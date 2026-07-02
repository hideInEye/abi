# Data Flow

## 主应用 apps/abi

1. `apps/abi/src/main.tsx` 初始化 i18n/loading/nprogress/icon/dayjs/router，并挂载 React。
2. qiankun 模式下从 host props 读取 `qiankunStore`，隐藏 host 菜单/头部，并调用 `fetchLoginChatbiByOnenet` 获取 token。
3. `apps/abi/src/App.tsx` 从 Redux 读取 locale/theme，生成 Ant Design theme 和 CSS vars，然后渲染 `RouterProvider`。
4. `apps/abi/src/router/index.ts` 创建 `@sa/simple-router` router。
5. `apps/abi/src/router/guard/index.ts` 在 init/beforeEach 中初始化常量路由、鉴权路由、检查 token、角色权限和 403/404。
6. 页面组件通过 `apps/abi/src/service/api/*` 调用 `request/apiRequest/chatRequest`。
7. `apps/abi/src/service/request/index.ts` 注入 Authorization/userId、判定成功码、转换 `response.data.data || response.data.rows`。
8. 401 或业务 code 401 进入 `apps/abi/src/service/request/error.ts` 和 `apps/abi/src/utils/auth.ts`，清理登录态并跳转登录。

## 聊天子应用 apps/chat

1. `apps/chat/src/main.tsx` fetch `config.json`，写入 `window.APP_CONFIG`。
2. `syncBootParamsFromUrl` 同步 URL 启动参数到 localStorage。
3. `apps/chat/src/App.tsx` 创建 TanStack Router，并把 `spaceId` 放入 router context。
4. 页面路由来自 `apps/chat/src/pages` 和 `apps/chat/src/routeTree.gen.ts`。
5. 会话核心在 `apps/chat/src/components/conversation/hooks/useConversationController.ts`，负责历史加载、流式回答、WebSocket/AbortController、分享、截图、调试信息等。
6. 请求通过 `apps/chat/src/service/request/index.ts` 注入 Authorization，并在开发环境把绝对 baseURL 改成同源路径以使用 Vite proxy。
7. token 过期由 `apps/chat/src/utils/auth.ts` 处理；若 host 注入 `window.onTokenExpired`，优先交给 host。

## 大屏设计器 apps/dashboard

1. `apps/dashboard/src/index.tsx` 调用 `loadAppConfig` 读取 config，并写入 host 传入的 basePath、initialPath、pageTitle、onTokenExpired。
2. qiankun 模式使用 `renderWithQiankun` 管理 mount/unmount/update。
3. `apps/dashboard/src/router/MainRouter.tsx` 创建 BrowserRouter 或 MemoryRouter，并提供 Home、Designer、View、Share、Result 等页面。
4. 数据请求通过 `apps/dashboard/src/utils/FetchUtil.ts`，自动拼接 `_apiTarget`、注入 Authorization，并在 401 时调用 token 过期流程。
5. 设计器状态分散在 `apps/dashboard/src/designer/manager/*`、`store/*`、`operate-provider/*`、`blueprint/*`。

## 共享鉴权流

- `packages/auth/src/index.ts` 是通用底座：标准化 token、生成 `Bearer`、处理登录过期互斥状态、通知和跳转。
- `apps/abi/src/utils/auth.ts` 使用 `localStg` 与 `@sa/auth` 结合。
- `apps/chat/src/utils/auth.ts` 从 `SOY-REACT_token` 或 `token` 读取 token。
- `apps/dashboard/src/utils/FetchUtil.ts` 使用 dashboard 自身 auth helper，并支持 host `onTokenExpired`。

## 数据流风险

- 多应用共用 token key 和 host 回调，修改任一侧需回归三端。
- `apps/abi/src/service/request/index.ts` 对成功码和返回转换做了宽松判断，接口变更容易引入隐式行为。
- `apps/chat` conversation controller 状态多，存在请求 token、AbortController、WebSocket、滚动锁定等并发边界。
