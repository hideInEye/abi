# Code Style

## 命名风格

- TypeScript/React 组件使用 PascalCase：如 `AppProvider`、`GlobalLoading`、`KnowledgeTable`。
- hooks 使用 `useXxx`：如 `useConversationController`、`useDebugStore`。
- Redux selector/action 使用 camelCase：如 `getThemeSettings`、`setThemeScheme`。
- API 函数常见 `fetchXxx`、`queryXxx`、`createXxx`、`updateXxx`、`deleteXxx`。
- 类型/interface 使用 PascalCase：如 `OntologyEntity`、`RequestInstanceState`。

## 文件组织

- app 入口集中在 `src/main.tsx`、`src/App.tsx`。
- 业务页面在 `src/pages/<domain>`。
- API 在 `src/service/api`，请求实例在 `src/service/request`。
- 工具函数在 `src/utils` 或 domain-local `utils`。
- 复杂模块通常有 `components`、`hooks`、`utils`、`types`、`constants` 子目录。

## 类型使用

- `apps/abi/tsconfig.json` 开启 `strict` 和 `strictNullChecks`。
- 项目仍存在较多 `any`，特别是复杂 UI/controller/request 交互；新增代码应尽量减少 `any`，但不要为局部任务大范围重写旧类型。
- 本体网络 ID 使用 `string | number`，`shared-network-types.ts` 注释明确不得强制转换为 number。

## 函数拆分习惯

- 请求和鉴权通过 helper/factory 封装。
- 复杂 UI 状态常通过 hook controller 或 manager 拆分。
- domain-local pure functions 与测试相邻放置是当前已有模式。

## 组件写法

- React function component 为主。
- `apps/dashboard` 仍有 class/manager 风格和大量 Less 配套。
- ABI 组件常使用 Ant Design 和 UnoCSS class。
- Chat 组件常使用 Tailwind utility class 和自定义 CSS variables。

## 错误处理

- ABI：`apps/abi/src/service/request/error.ts` 统一处理 backend fail 和 network error。
- Chat：`apps/chat/src/service/request/index.ts` axios interceptors 中处理 401 和 console error。
- Dashboard：`apps/dashboard/src/utils/FetchUtil.ts` 返回 `{ code, msg, data }`，并在 401 调用 token 过期流程。

## 异步处理

- 请求层使用 async/await。
- Chat conversation controller 使用 AbortController、request token、WebSocket ref 和 loading flags 防止竞态。
- ABI route init/guard 使用 async dispatch 初始化路由。

## 注释风格

- 存在中英文混合注释。
- 复杂业务原因可以保留简短注释，避免重复解释显而易见的语句。
- `apps/dashboard` 文件存在版权声明，修改该 app 时保留原声明。

## 导入顺序

- `apps/abi/eslint.config.js` 和 `apps/chat/eslint.config.js` 配置了 import/order：builtin、external、internal、parent、sibling、index、object，并要求 import 后空行。
- `@` 和 `~` 属于 internal pathGroups。

## 格式化

- `.prettierrc`：singleQuote true、semi false、trailingComma all、printWidth 200、tabWidth 2。
- 注意部分现有文件仍有分号或不同缩进，新增代码优先遵守当前文件附近风格和 Prettier 配置。

## 禁止引入的风格

1. 不要在业务页面内重复实现通用请求/鉴权逻辑。
2. 不要在 packages 中写 app-specific 路由、接口地址或页面逻辑。
3. 不要为测试大规模重构业务代码。
4. 不要跨 app 复制样式系统。
5. 不要新增无证据的全局规则或全局变量。

## 新代码必须遵守的规则

1. 优先使用现有 `@sa/*` 包和 app-local helpers。
2. 新增 API 走所属 app 的 request 封装。
3. 新增复杂纯逻辑补 Vitest。
4. 修改共享包必须检查所有调用 app。
5. UI 修改必须同时考虑 loading/empty/error 状态和响应式。
