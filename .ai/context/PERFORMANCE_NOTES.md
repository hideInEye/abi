# Performance Notes

## 已有性能相关设计

- Turbo pipeline 缓存：`turbo.json`。
- Vite optimizeDeps：`apps/abi/build/optimize` 由 `apps/abi/vite.config.ts` 引入。
- Vite server warmup：`apps/abi/vite.config.ts` 的 `warmup.clientFiles`。
- lazy/Suspense：`apps/dashboard/src/index.tsx`、`apps/dashboard/src/router/MainRouter.tsx`。
- Nginx gzip：`nginx/nginx.conf`、`apps/dashboard/nginx.conf`。
- 静态资源缓存：`apps/dashboard/nginx.conf`、`apps/abi/vercel.json`。

## 性能敏感区域

- Chat conversation：流式回答、WebSocket、长列表滚动、截图下载，证据 `apps/chat/src/components/conversation/hooks/useConversationController.ts`。
- Dashboard 设计器：画布、拖拽、缩放、图层、蓝图、Pixi/Moveable/Selecto，证据 `apps/dashboard/src/designer/*`。
- ABI 本体知识图谱：G6/X6/G6 graph、ontology network 数据转换。
- 大量 Ant Design 表格/抽屉/弹窗页面。

## 新代码性能规则

1. 长列表和画布操作避免无边界 setState。
2. WebSocket/AbortController/定时器必须在 unmount 或请求切换时清理。
3. 大数据转换优先抽纯函数并单测，避免在 render 中重复计算。
4. 设计器变更必须关注拖拽和缩放流畅度。
5. 构建体积变化较大时，运行 build 并检查输出。

## 未确认事项

当前仓库未发现 bundle analyzer、性能预算、前端监控或 RUM 配置。建议后续人工确认是否有外部平台。
