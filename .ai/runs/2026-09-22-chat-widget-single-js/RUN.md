# Chat Widget 单 JS Web Component

## 目标

重新生成 `apps/chat/public/abi-assistant-widget.js`，让第三方系统通过一个脚本和 `<abi-assistant>` 标签嵌入线上 Chat 分享页。

## 实现

- 注册无框架依赖的 `<abi-assistant>` Custom Element。
- 使用 Shadow DOM 隔离悬浮按钮、面板和操作栏样式。
- iframe 加载 `#/dashboard_share_page/{shareCode}?embed=1`，真实对话功能仍由线上 Chat 应用提供。
- 未传 `base` 时，从 `document.currentScript.src` 推导 Chat 部署目录；显式 `base` 属性可覆盖。
- 支持 `share-code`、`base`、`mode`、`open`、`primary-color`、`width`、`height`、`z-index`。
- floating 模式支持打开、关闭、拖拽、最大化和还原；inline 模式铺满宿主容器。
- 避免重复执行脚本时重复注册 Custom Element。

## 验证

- `node --check apps/chat/public/abi-assistant-widget.js`：通过。
- `pnpm --dir apps/chat exec eslint public/abi-assistant-widget.js`：通过。
- `pnpm --filter ai-bot build`：通过，转换 6141 个模块；仅有项目既存 antd directive、动态导入和 chunk size 警告。
- `apps/chat/public/abi-assistant-widget.js` 与 `apps/chat/dist/abi-assistant-widget.js` SHA256 一致：`0A1060E266C5628F1D840DC675970EDE884A944065BB3AFC4D2F7AC8097A2310`。
- 输出文件大小：16025 bytes。
- 浏览器自动 smoke 调用被取消，未声称完成真实 iframe 网络联调；分享路由和 `embed=1` 兼容逻辑已由现有代码确认。

## 风险与使用条件

- 线上 Chat 响应必须允许第三方页面通过 iframe 嵌入，不能被 `X-Frame-Options` 或 CSP `frame-ancestors` 阻止。
- 默认 base 依赖普通同步 `<script src>` 的脚本地址；若通过特殊 loader 执行导致 `document.currentScript` 为空，会回退到当前页面 origin 下的 `/chat-ui`，此时应显式传 `base`。
- 第三方无需 React/npm 依赖，也无需代理 Chat 的接口；iframe 内由 Chat 应用使用自身线上配置发请求。

## AI 系统更新

- 已更新 `CURRENT_REQUIREMENT.md` 与 `MODULE_MAP.md`。
- 本次不需要更新 prompts、agents、skills、mcp、checklists 或 decisions。
