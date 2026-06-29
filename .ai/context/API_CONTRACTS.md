# API Contracts

## API 文件位置

- ABI API：`apps/abi/src/service/api/*`
- Chat API：`apps/chat/src/service/api/*`
- Dashboard fetch：`apps/dashboard/src/utils/FetchUtil.ts`
- 通用请求：`packages/axios/src/*`

## ABI 请求实例

`apps/abi/src/service/request/index.ts` 定义：

- `request`：使用 `baseURL`，注入 Authorization 和 userId，成功后返回 `response.data.data || response.data.rows`。
- `apiRequest`：使用 `apiURL`，特殊处理 `/abi-system/onenet/api/loginChatbi` 和 `customRequests`。
- `chatRequest`：使用 `chatURL`，注入 Authorization/userId，返回 `response.data.data`。
- `demoRequest`：示例请求，成功条件为 `response.data.status === '200'`。

成功码来自 env：

- `VITE_SERVICE_SUCCESS_CODE=200`
- `VITE_SERVICE_SUCCESS_CODE1=0000`

证据：`apps/abi/.env`、`apps/abi/src/service/request/index.ts`。

## Chat 请求约定

`apps/chat/src/service/request/index.ts` 使用 axios 实例：

- 默认 `baseURL: '/'`。
- 开发环境如果 config 传入绝对 baseURL，会改为同源 pathname，让请求走 Vite proxy。
- responseType 为 blob 时返回原始 response。
- 业务 code 401 或 HTTP 401 触发 `handleLoginExpired`。

## Dashboard 请求约定

`apps/dashboard/src/utils/FetchUtil.ts` 使用 fetch 封装：

- 运行时读取 `config.json` 中的 `VITE_API_TARGET`。
- 非绝对 URL 会拼接 `_apiTarget`。
- 自动注入 Authorization。
- 标准返回 `{ code, msg, data }`；若后端不是该格式，则包装为成功结构。

## 业务 API 命名

`apps/abi/src/service/api` 按领域拆分：auth、user、role、menu、space、conv、ontology-network、dimension-modeling、assistant-manage、tool、skill、plugin/model 等。

## 新增 API 规则

1. 按所属 app 现有 request 封装新增，不要直接裸用 `fetch` 或 `axios`。
2. API 函数参数和返回类型应定义在同域 types 中；如果接口 ID 可能超出安全整数，使用 `string | number`。
3. 接口成功码、错误提示、token 过期必须走统一封装。
4. 新增接口适配层要写 characterization/unit test，覆盖参数映射、返回 fallback、错误分支。

## 未确认事项

当前仓库未发现集中 OpenAPI/Swagger/GraphQL schema 文件。接口字段以现有 service 文件和 domain type 为准，后续涉及协议变化需人工或后端文档确认。
