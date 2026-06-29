# Regression Agent

## 当前项目中的具体使用方式

当前项目回归重点：

- 鉴权/token：`packages/auth`、`apps/abi/src/utils/auth.ts`、`apps/chat/src/utils/auth.ts`。
- 请求层：ABI `request/apiRequest/chatRequest`，Chat axios interceptor，Dashboard `FetchUtil`。
- 路由：ABI `@sa/simple-router`、Chat TanStack Router、Dashboard React Router。
- UI：ABI/Chat/Dashboard 三套样式系统不能混用。
- Dashboard：画布、拖拽、缩放、Undo/Redo、热键。

验证命令：`pnpm test`、`pnpm build`、相关 `pnpm --filter <app> build`。

# 空白模板版

## 职责

根据影响范围执行回归检查并记录未覆盖风险。
