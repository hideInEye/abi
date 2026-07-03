# Debug Failure

## 当前项目执行示例

如果 `pnpm build` 失败：

1. 看失败 app：`chatbi`、`ai-bot` 或 `abi-dashboard`。
2. ABI 查 `apps/abi/vite.config.ts`、`apps/abi/src/router`、`apps/abi/src/service/request`。
3. Chat 查 `apps/chat/vite.config.ts`、`apps/chat/src/router`、`apps/chat/src/service/request`。
4. Dashboard 查 `apps/dashboard/vite.config.ts`、`apps/dashboard/src/designer`。

如果看到以下现象，先标记为已知基线：

- `pnpm lint` 的 `Invalid option '--ext'`。
- `pnpm type-check` 打印 TypeScript help。
- build 的 `"use client"` ignored、chunk size、dashboard `eval` warning。

## 空白模板版

复现失败、定位第一个真实错误、判断是否当前改动引起、补测试、最小修复、重新验证。
