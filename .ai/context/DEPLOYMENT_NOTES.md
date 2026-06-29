# Deployment Notes

## 根 Docker/Nginx 部署

证据：

- `dockerfile`
- `docker-compose.yml`
- `nginx/nginx.conf`
- `nginx/abi.conf`
- `nginx/chat.conf`

流程：

1. 构建 `apps/abi/dist` 和 `apps/chat/dist`。
2. Docker 镜像基于 `nginx:1.24.0`。
3. 复制 `apps/abi/dist` 到 `/usr/share/nginx/html/abi`。
4. 复制 `apps/chat/dist` 到 `/usr/share/nginx/html/chat`。
5. Nginx 80 端口服务主应用，9100 端口服务 chat 子应用。

## ABI Nginx

- `/` 指向主应用静态文件。
- `/chat-ui/` proxy 到 `http://127.0.0.1:9100/`。
- `/api/` 和 `/chat-proxy/` proxy 到内网地址。

## Dashboard 单独部署

证据：

- `apps/dashboard/Dockerfile`
- `apps/dashboard/nginx.conf`

流程：

1. 先本地构建 dashboard `dist`。
2. Docker 镜像基于 `nginx:alpine`。
3. 复制 `dist` 到 `/usr/app/abi-dashboard`。
4. 暴露 81 端口。
5. `/dashboard-ui/` alias 到 dashboard 静态资源。

## Vercel 配置

`apps/abi/vercel.json` 存在 rewrites、headers、regions、redirects 配置，但当前部署主路径是否使用 Vercel 未确认。

## 未确认事项

- 当前仓库未发现 CI workflow 或发布流水线配置。
- Docker 镜像名、部署环境变量、生产 API target 需要人工确认。
- 内网 IP 是否适用于当前环境需要人工确认。

## 部署修改规则

1. 修改 `base`、`basename`、`basepath` 前必须同时检查 Vite、router、nginx 和 qiankun。
2. 修改 Nginx proxy 前必须确认后端路径、CORS、Authorization、WebSocket。
3. 修改静态缓存策略前必须确认 `config.json`、`index.html` 和资源 hash 行为。
