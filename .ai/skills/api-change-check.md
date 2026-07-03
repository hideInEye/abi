# API Change Check

## 当前项目执行示例

ABI API 变更：

- API 文件：`apps/abi/src/service/api/*`
- 请求实例：`apps/abi/src/service/request/index.ts`
- 错误处理：`apps/abi/src/service/request/error.ts`

Chat API 变更：

- API 文件：`apps/chat/src/service/api/*`
- 请求实例：`apps/chat/src/service/request/index.ts`

Dashboard API 变更：

- 请求封装：`apps/dashboard/src/utils/FetchUtil.ts`

检查：

- Authorization 是否注入。
- 401 是否走统一过期处理。
- 返回结构是否兼容 `data/rows` 或 `{ code, msg, data }`。
- 是否补 adapter/pure test。

## 空白模板版

列出接口路径、请求封装、参数类型、返回类型、错误处理、测试和回归范围。
