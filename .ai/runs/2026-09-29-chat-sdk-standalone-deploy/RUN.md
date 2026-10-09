# RUN: chat-sdk dist 支持独立静态站点部署

## 背景

- chat-sdk 为 Vite lib 模式构建，dist 仅含 `abi-assistant-widget.js` / `.css`，无 `index.html`。
- 将 dist 整目录部署到 nginx 后浏览器打开目录 URL，nginx 因目录无 index 文件且 autoindex 关闭返回 403 Forbidden。

## 修改

- `apps/chat-sdk/vite.config.ts`：新增 `emitStandalonePage` 插件（`apply: 'build'`），closeBundle 时向 dist 写入生产调试页 `index.html`：相对路径引用 `./abi-assistant-widget.js`（CSS 由 SDK 按脚本路径自动加载），`share-code` / `base` 支持 URL 参数 `?shareCode=&base=` 覆盖，默认值与 dev 调试页一致。
- 该页只写 dist，不进入 `copyArtifacts` 的 chat/public 同步列表，避免覆盖 Chat 自身 index.html。

## 验证

- `pnpm --filter @abi/chat-widget build`：通过，dist 含 index.html + abi-assistant-widget.js + abi-assistant-widget.css。
- `pnpm --filter @abi/chat-widget type-check`：通过。
- `apps/chat/public` 无新增文件，既有 `/chat-ui/` 随 Chat 部署链路不受影响。

## 部署说明

- dist 整目录可放任意 nginx 静态目录（含子路径，页内资源为相对引用）；nginx 有 index.html 后不再 403。
- 独立部署域与后端网关不同域时，`base` 需传网关完整地址且后端放行 CORS，或在该 nginx 上加同源反向代理。

## 知识更新建议

- 「ABI助手浮窗SDK接入规范」可补充独立部署入口页与 URL 参数说明。
