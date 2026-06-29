# Error Handling

## ABI

- 后端业务失败：`apps/abi/src/service/request/error.ts` 的 `backEndFail`。
- 网络/axios 错误：`handleError`。
- 401 判定：HTTP status 401 或 `response.data.code === '401'`。
- 错误展示去重：`apps/abi/src/service/request/shared.ts` 的 `showErrorMsg` 使用 `errMsgStack`。
- 登录过期：`apps/abi/src/utils/auth.ts` 的 `handleLoginExpired`。

规则：

1. 新请求必须接入 `request`、`apiRequest` 或 `chatRequest`。
2. 不要在页面里重复实现 401 跳转。
3. 特定接口静默错误必须有明确注释和业务原因。

## Chat

- axios interceptors 位于 `apps/chat/src/service/request/index.ts`。
- blob response 直接返回原始 response。
- 业务 code 401 和 HTTP 401 都调用 token 过期处理。
- 其他错误当前主要 console.error 后 reject。

规则：

1. UI 层需要自行处理 reject 后的用户提示。
2. 依赖 host `window.onTokenExpired` 的场景需要保留兼容。

## Dashboard

- `apps/dashboard/src/utils/FetchUtil.ts` 将请求失败包装为 `{ code, msg, data: null }`。
- 401 调用 `notifyTokenExpired`。
- 部分错误只 console.error，调用方必须根据 `code` 做展示或降级。

## 共享 Auth

`packages/auth/src/index.ts` 使用 stateKey 避免重复登录过期处理，支持 redirect delay、notice、clearAuth、logout。

## 测试建议

新增错误处理逻辑必须覆盖：

- 401 分支
- 非 2xx HTTP 分支
- 后端业务失败分支
- 成功但 data/rows 缺失 fallback
- blob/非 JSON 特例
