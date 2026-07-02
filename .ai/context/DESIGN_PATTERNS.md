# Design Patterns

## Monorepo 分层

应用代码放 `apps/*`，共享能力放 `packages/*`。这是仓库最重要的结构模式，证据见 `pnpm-workspace.yaml`。

## Request Factory

`packages/axios/src/index.ts` 提供 `createRequest` 和 `createFlatRequest`，应用层通过 hooks 配置成功判定、错误处理、请求拦截和响应转换。

在 `apps/abi/src/service/request/index.ts` 中，主应用创建了 `request`、`apiRequest`、`chatRequest`、`demoRequest` 多个实例，分别面向不同 baseURL 和返回转换。

## Auth Manager

`packages/auth/src/index.ts` 提供 `createAuthManager`，由 app 注入 `clearAuth`、`getToken`、`notify`、`redirectToLogin`，从而统一 401/登出流程但保留 app 自身跳转方式。

## Router Adapter

`packages/simple-router/src/router.ts` 包装 React Router，提供 Vue Router 风格的 `beforeEach/afterEach/push/addRoute/removeRoute`。`apps/abi/src/router/index.ts` 使用该适配层接入 auto-route。

## Domain-local Types and Utilities

复杂业务模块倾向于在 domain 内维护 types/utils/tests。例如：

- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts`
- 对应测试文件位于同域附近。

## Store Slice Pattern

`apps/abi/src/store/index.ts` 使用 Redux Toolkit `combineSlices`，各 slice 位于 `apps/abi/src/store/slice/*`。

## Hook Controller Pattern

`apps/chat/src/components/conversation/hooks/useConversationController.ts` 把复杂 conversation 交互集中进 hook controller，组件通过 hook 暴露状态和操作。

## Manager Pattern

`apps/dashboard/src/designer/manager/*` 使用 manager 管理画布、图层、蓝图、过滤器等设计器领域状态，`AbstractManager` 定义 init 类接口。

## Config Loader Pattern

`apps/chat/src/main.tsx` 和 `apps/dashboard/src/utils/FetchUtil.ts` 都存在运行时读取 `config.json` 的模式，用于部署后配置 API target 或子应用参数。

## 新代码规则

1. 不要把 app 业务逻辑放入共享 package。
2. 新增 API 按现有 `service/api/<domain>.ts` 模式组织。
3. 新增复杂转换逻辑优先抽成 domain-local pure function 并补 Vitest。
4. UI 复杂交互优先沿用当前模块已有 controller/manager/store 模式。
