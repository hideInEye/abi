# 项目实例版：当前项目需求填写示例

## 需求类型

Bug 修复

## 背景

`apps/chat/src/service/request/index.ts` 在开发环境会把绝对 `baseURL` 转成同源路径，让请求走 Vite proxy。后续如果某个聊天接口绕过该封装，可能出现跨域或 token 未注入问题。

## 目标

修复某个 `apps/chat/src/service/api/conv.ts` 调用不走统一 `service` 封装的问题，确保 Authorization header 和 401 处理一致。

## 非目标

- 不改 `packages/axios` 的共享实现。
- 不改 `apps/abi` 的请求封装。
- 不调整聊天 UI。

## 影响范围预期

- `apps/chat/src/service/request/index.ts`
- `apps/chat/src/service/api/conv.ts`
- `apps/chat/src/utils/auth.ts`
- 可能新增 `apps/chat/src/service/api/*.test.ts`

## 详细需求

所有 chat 会话接口都必须通过 `apps/chat/src/service/request/index.ts` 导出的 axios 实例请求，不能直接 `fetch` 或新建 axios 实例。

## 验收标准

- 请求拦截器会调用 `getAuthorization()`。
- 401 会触发 `handleLoginExpired()`。
- 相关测试或手动验证记录写入 run log。

## 测试要求

当前项目已有 Vitest。优先补 pure helper 或 request adapter 测试；如涉及浏览器环境无法稳定测试，记录手动验证步骤。

## UI / 样式要求

本需求不涉及 UI。

## 数据 / 接口要求

保持现有接口路径和返回结构兼容。

## 风险和限制

开发代理依赖 `apps/chat/vite.config.ts` 中 `/api`、`/chat-proxy`、`/abi-chat-proxy` 配置，内网后端不可达时不能把外部网络失败误判为前端逻辑失败。

---

# 空白模板版

## 需求类型

新功能 / Bug 修复 / 重构 / 性能优化 / UI 调整 / 测试补充 / 文档更新 / 其他

## 背景

## 目标

## 非目标

## 用户流程 / 使用场景

## 影响范围预期

## 详细需求

## 验收标准

## 测试要求

## UI / 样式要求

## 数据 / 接口要求

## 风险和限制

## 备注
