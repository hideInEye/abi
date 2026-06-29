# Browser / Playwright MCP

## 用途

验证 ABI、Chat、Dashboard 的 UI、路由、微前端和交互。

## 当前项目场景

- ABI 主应用 port 9527。
- Chat 子应用 port 5173。
- Dashboard 设计器本地端口以 vite dev config 为准。

## 检查项

- 页面是否加载。
- 控制台是否报错。
- 文本/按钮是否溢出。
- loading/empty/error 是否合理。
- Dashboard 画布是否非空且可交互。

## 风险

- 依赖本地服务和后端代理。
- 截图只覆盖当前视口。

## 规则

1. UI 变更尽量截图验证。
2. 微前端路径变更同时检查 host 和子应用。
3. 后端不可达时记录限制。
