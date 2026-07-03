# Inspect Logs

## 当前项目执行示例

日志来源：

- Terminal：`pnpm test`、`pnpm build`、app-specific build。
- 浏览器：ABI 9527、Chat 5173、Dashboard dev server。
- 网络：`/api`、`/chat-proxy`、`/abi-chat-proxy`，见 Vite config。

分类：

- 401/token：查 `packages/auth` 和 app auth helper。
- Vite build：查对应 app `vite.config.ts`。
- Dashboard eval warning：当前构建已知，涉及 `apps/dashboard/src/...` 多处。
- UnoCSS icon warning：ABI 当前构建已知 `selector-popover`、`selector-trigger`。

## 空白模板版

收集日志、提取第一错误、映射模块、给出复现命令、记录到 run log。
