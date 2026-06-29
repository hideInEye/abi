# 项目实例版：修复 Chat token 过期后重复跳转

## 问题标题

Chat 子应用接口连续 401 时重复触发登录过期流程。

## 问题现象

在 `apps/chat` 会话页面同时触发多个接口请求，若后端返回 401，可能多次调用 `handleLoginExpired()`，导致消息提示或 host 回调重复执行。

## 复现步骤

1. 启动 `pnpm --filter ai-bot dev`。
2. 清理或设置无效 localStorage token。
3. 进入 `apps/chat/src/pages/chat` 对应页面并触发会话接口。
4. 观察 console、message 和 `window.onTokenExpired` 调用次数。

## 期望行为

同一轮 token 过期只触发一次登录过期处理。

## 实际行为

示例问题假设为重复触发。真实开发时必须先复现。

## 影响范围

- `apps/chat/src/service/request/index.ts`
- `apps/chat/src/utils/auth.ts`
- `packages/auth/src/index.ts`

## 环境信息

React 18、Vite 6、Ant Design、TanStack Router。Chat 端口来自 `apps/chat/vite.config.ts`：5173。

## 相关日志 / 截图

当前仓库未发现明确日志，后续需要复现时补充浏览器 console/network。

## 初步怀疑模块

`packages/auth/src/index.ts` 已有 stateKey 防重逻辑；若重复触发，先检查 Chat 是否复用了同一个 `authManager` 实例。

## 修复目标

确保 Chat 401 处理复用 `apps/chat/src/utils/auth.ts` 中的 `authManager.handleUnauthorized()`，不新增孤立全局状态。

## 非目标

- 不改 ABI 登录页。
- 不改后端 401 协议。

## 验收标准

- 多个 401 并发时只出现一次登录过期处理。
- `packages/auth` 相关单测或 Chat helper 测试通过。

## 回归测试要求

优先为 `packages/auth/src/index.ts` 添加 Vitest；若测试浏览器 message 不稳定，则测试 auth manager 防重行为。

## 风险和限制

Host 注入 `window.onTokenExpired` 时 Chat 不显示本地 message，这个兼容行为不能破坏。

---

# 空白模板版

## 问题标题

## 问题现象

## 复现步骤

## 期望行为

## 实际行为

## 影响范围

## 环境信息

## 相关日志 / 截图

## 初步怀疑模块

## 修复目标

## 非目标

## 验收标准

## 回归测试要求

## 风险和限制
