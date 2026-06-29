# State Management

## apps/abi

- 主要状态：Redux Toolkit。
- 入口：`apps/abi/src/store/index.ts`。
- slice：`routeSlice`、`appSlice`、`authSlice`、`themeSlice`、`tabSlice`、`layoutSlice`、`loadingReducer`。
- 创建 slice helper：`apps/abi/src/store/createAppSlice.ts` 使用 `buildCreateSlice` 和 async thunk。
- 主题状态：`apps/abi/src/store/slice/theme/index.ts`。

规则：

1. 新增全局业务状态优先放入 `src/store/slice/<domain>`。
2. 页面局部状态优先放组件或 domain hook。
3. 不要把服务端缓存大量塞进 Redux，除非已有模块这么做且需求要求。

## apps/chat

- Zustand：`apps/chat/src/store/index.ts`，管理 debugInfoMap、userDebugInfoMap、userChatHistory。
- Redux Toolkit：`apps/chat/src/store/redux/index.ts` 存在 conversations reducer，但 `main.tsx` 中 Provider 导入被注释，当前未发现其真实挂载证据。

规则：

1. conversation 交互优先沿用现有 hook controller 和 Zustand。
2. 若启用 Redux Provider，必须确认入口挂载和持久化策略。

## apps/dashboard

- MobX：`apps/dashboard/package.json`，示例 `apps/dashboard/src/designer/store/RuntimeStore.ts` 使用 `makeObservable`、observable、action。
- Manager：`apps/dashboard/src/designer/manager/*` 管理设计器核心数据。

规则：

1. 设计器状态修改需定位 manager/store 的归属。
2. 不要绕过 manager 直接在多个组件复制状态。
3. Undo/Redo、热键、拖拽状态修改必须做回归。

## 服务端状态

当前仓库根依赖包含 `@tanstack/react-query`，但扫描未确认主流程大量使用。当前仓库未发现明确证据，建议后续人工确认 React Query 是否仍在使用或只是预留依赖。
