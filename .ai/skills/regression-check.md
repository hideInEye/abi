# Regression Check

## 当前项目执行示例

按修改文件选择回归：

- `packages/auth`：回归 ABI、Chat、Dashboard token 过期。
- `packages/axios`：回归 ABI request 和 Chat request。
- `apps/abi/src/router`：回归登录、403/404、动态路由、qiankun basename。
- `apps/chat/src/components/conversation`：回归历史加载、流式回答、AbortController、分享/截图。
- `apps/dashboard/src/designer`：回归画布、拖拽、缩放、Undo/Redo、热键。

命令：

- `pnpm test`
- `pnpm build`
- 相关 `pnpm --filter <app> build`

## 空白模板版

列出影响模块、回归点、命令、结果、未覆盖风险。
