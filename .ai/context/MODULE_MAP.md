# Module Map

## 根工程

- 路径：`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`Makefile`
- 职责：workspace、Turbo pipeline、统一脚本、构建入口。
- 输入输出：输入为各 app/package 源码；输出为 `apps/*/dist` 和 `packages/*/dist`。
- 注意事项：根 `test` 使用 Vitest coverage；`build` 只过滤 `apps/*`。
- 测试建议：修改根脚本后运行对应 `pnpm <script>` 或至少 `pnpm --filter <pkg> <script>`。

## apps/abi

- 路径：`apps/abi`
- 职责：主业务管理端、路由权限、主题系统、数据工作台、本体知识图谱、系统管理、应用管理、qiankun host/sub-app 兼容。
- 依赖：`@sa/auth`、`@sa/axios`、`@sa/simple-router`、`@sa/hooks`、`@sa/materials`、Ant Design、Redux Toolkit、UnoCSS。
- 输入：环境变量 `.env*`、后端 API、localStorage token、qiankun props。
- 输出：业务页面、请求结果、路由状态、全局主题和菜单状态。
- 注意事项：不要绕过 `src/service/request/index.ts`；不要把 ID 强转为 number，特别是 ontology 模块。
- 测试建议：新增纯函数、mapper、validator、请求参数转换优先补 Vitest。
- 公共元数据分析：`src/components/metadata-analysis/index.tsx` 提供按需加载的抽屉默认导出与 `useMetadataAnalysis`，新列表统一从该入口引用；仅打开抽屉后加载关系图依赖和查询。数据准备、本体网络、助手编排及智能体列表共用，不复制分析 UI。

## apps/chat

- 路径：`apps/chat`
- 职责：聊天 UI、会话历史、流式回答、图表/表格展示、调试信息、分享。
- 依赖：TanStack Router、Zustand、Ant Design、Tailwind、axios、`@sa/auth`、`@sa/axios`。
- 输入：`public/config.json`、URL boot params、localStorage token、后端聊天/分析接口。
- 输出：会话消息、图表、下载/截图、调试状态。
- 注意事项：`src/main.tsx` 会 fetch config 后挂载；`src/service/request/index.ts` 在开发环境会把绝对 baseURL 降为同源路径以走 Vite proxy。`src/components/chat-widget/` 为 Chat 内的分享悬浮框；`public/abi-assistant-widget.js` 与同名 CSS 由 `apps/chat-sdk` 构建并复制而来，Chat 构建时原样复制到 `dist` 对外提供。
- 测试建议：优先覆盖 `syncBootParams`、conversation helpers、图表数据转换和 token 过期处理。

## apps/chat-sdk

- 路径：`apps/chat-sdk`，包名 `@abi/chat-widget`。
- 职责：独立构建助手浮窗 SDK；`src/element.ts` 把自定义元素属性传入 `AbiAssistant`，使用 SDK 内 `src/chat/` 下的组件与服务。
- 依赖：构建期 Vite + TypeScript；产物内置 React、ReactDOM 和 ChatWidget 运行依赖。
- 输入：`<abi-assistant>` 的 `share-code`、`base`、`theme`、`theme-switch` 属性；关闭面板派发 `close` 事件，由宿主移除或隐藏。
- 输出：`dist/abi-assistant-widget.js`（单 IIFE）和 `dist/abi-assistant-widget.css`，不输出 ESM 或类型声明。
- 注意事项：修改 SDK 后先构建 SDK、再构建 Chat；SDK 构建会同步两个产物到 `apps/chat/public/`。脚本自动补载同目录 CSS，宿主手动加载时使用 `abi-assistant-widget-styles` 标识避免重复。SDK 源码与 Chat 分享组件目前为两套文件，修改时应区分调用入口，不能假设自动同步。
- 测试建议：`pnpm --filter @abi/chat-widget build` 和 `node --check dist/abi-assistant-widget.js`；现有 `type-check` 含 `--noCheck`，不代表类型验证通过。真实接口调用还需验证分享校验、鉴权及跨域限制。

## apps/dashboard

- 路径：`apps/dashboard`
- 职责：大屏设计器、画布、组件库、蓝图、数据源、模板市场、预览/分享。
- 依赖：React Router、MobX、Ant Design、Less、Moveable/Selecto/Pixi/G2Plot 等。
- 输入：`config.json`、后端项目/数据源 API、设计器交互事件。
- 输出：设计器状态、组件配置、画布渲染、分享/预览页面。
- 注意事项：设计器状态分散在 manager/store 中，修改前必须定位具体 manager；避免破坏 Undo/Redo 和热键。
- 测试建议：复杂纯逻辑可先抽出 characterization tests；UI/画布类变更建议配合浏览器截图检查。

## packages/auth

- 路径：`packages/auth/src/index.ts`
- 职责：token 标准化、Authorization header、统一登录过期/登出流程。
- 依赖：无业务 app 依赖。
- 输入：token-like 值、清理函数、通知函数、跳转函数。
- 输出：Authorization header、handleUnauthorized/logout 过程。
- 注意事项：保持业务无关；修改后必须检查 abi/chat/dashboard 的 token 过期链路。
- 测试建议：补 normalizeToken、createAuthorizationHeader、handleUnauthorized 的单元测试。

## packages/axios

- 路径：`packages/axios/src`
- 职责：axios 实例工厂、请求 id、AbortController、retry、业务成功判定 hook、flat request。
- 依赖：`@sa/auth`、`@sa/utils`、axios、axios-retry。
- 输入：axios config、RequestOption。
- 输出：request/flatRequest 实例。
- 注意事项：共享请求行为改动会影响主应用和聊天子应用。
- 测试建议：补 `isBackendCodeIn`、authorization header、flat request 错误返回行为测试。

## packages/simple-router

- 路径：`packages/simple-router/src`
- 职责：基于 React Router 的路由创建、守卫、动态路由 patch、matcher。
- 依赖：React Router、`@ohh-889/react-auto-route`。
- 输入：Elegant routes、init routes、guard callbacks。
- 输出：router 实例和 RouterProvider hooks。
- 注意事项：此包服务 `apps/abi`，改动会影响路由守卫和动态权限路由。
- 测试建议：补 matcher/resolve/addRoute/removeRoute 的纯逻辑测试。

## packages/hooks

- 路径：`packages/hooks/src`
- 职责：共享 hooks，包括 useRequest、loading、boolean、table 等。
- 注意事项：hooks 修改必须关注 React hooks rules 和调用方渲染时机。
- 测试建议：纯 utils 可单测；hooks 建议后续引入 React Testing Library 后补。

## packages/materials

- 路径：`packages/materials/src`
- 职责：AdminLayout、PageTab、SimpleScrollbar 等共享 UI 材料。
- 注意事项：样式包含 CSS Modules，修改时同步检查类型声明和 ABI 布局。
- 测试建议：视觉/布局变更需要应用级 smoke 和浏览器检查。

## packages/color / utils / config

- 路径：`packages/color/src`、`packages/utils/src`、`packages/config-*`
- 职责：颜色算法、通用工具、共享 ESLint/Tailwind/TSConfig。
- 注意事项：这些包偏底层，修改需优先单测。

## packages/scripts

- 路径：`packages/scripts/src`
- 职责：CLI 脚本，含 git commit、release、router 生成等命令。
- 注意事项：`apps/abi/package.json` 的 `gen-route`、`commit`、`release` 依赖该包。
