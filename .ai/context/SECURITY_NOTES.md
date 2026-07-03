# Security Notes

## 鉴权

- 通用 token 处理在 `packages/auth/src/index.ts`。
- ABI token 存储通过 `apps/abi/src/utils/storage.ts` 和 `localStg` 间接管理。
- Chat 从 `SOY-REACT_token` 和 `token` 读取 token，证据 `apps/chat/src/utils/auth.ts`。
- 请求头使用 `Bearer <token>`，证据 `createAuthorizationHeader`。

## 跳转安全

`apps/abi/src/utils/auth.ts` 的 `getSafeLoginRedirectPath` 会阻止跨 origin、空路径、双斜线和 login/logout/403/404 等 blocked path，用于登录 redirect 安全。

## API 代理

- 开发代理中存在内网 IP 和 HTTPS `secure: false` 配置，证据 `apps/abi/vite.config.ts`、`apps/chat/vite.config.ts`。
- Nginx 代理也写死部分内网地址，证据 `nginx/abi.conf`、`apps/dashboard/nginx.conf`。

风险：

1. 内网地址和 `secure: false` 不应泄漏到公共部署配置。
2. 修改代理规则需确认 CORS、Authorization header 和路径 rewrite。

## 本地存储

localStorage 中存在 token、refreshToken、userInfo、spaceId、spaceName、userId 等清理逻辑，证据 `apps/abi/src/store/slice/auth/index.ts` 搜索结果和 `apps/chat/src/utils/auth.ts`。

## 依赖安全

当前仓库未发现依赖审计脚本或 CI 安全扫描配置，建议后续人工确认。

## 新代码安全规则

1. 不要把 token 写进日志。
2. 不要新增开放重定向。
3. 不要在前端硬编码新的生产密钥或私有 token。
4. API key、模型、插件、工具等页面涉及敏感配置时，必须检查展示、复制、下载和日志路径。
