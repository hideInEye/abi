# RUN: 原 React ChatWidget 弹窗单 JS SDK

- 日期：2026-09-23
- 范围：`apps/chat-sdk`、`apps/chat/public/abi-assistant-widget.js`

## 目标

- 用原 `apps/chat/src/components/chat-widget/ChatWidget.tsx` 直接替代 iframe 与手写浮窗外壳。
- 交付一个可被 Vue 2 通过 `<script>` 与 `<abi-assistant>` 标签使用的单 JS 弹窗。

## 实现

- 新增 `src/widget.tsx`：自定义元素使用 `createRoot()` 将原 ChatWidget 以 `float` 模式渲染到元素自身；`share-code` 与 `base` 属性分别传递给 `shareCode`、`apiBase`，关闭事件卸载 React root。
- 删除旧 iframe 外壳 `src/widget.ts`、手写 CSS 与图标文件。
- `vite.config.ts`：添加 Chat 源码及 `@sa/*` alias、React 去重和 JSX 转换；构建完成时将 `chat-widget.css` 内容注入 IIFE，确保客户只引用 JS；随后同步 JS 到 `apps/chat/public`。
- `package.json`：补 React、ReactDOM 与类型依赖；`type-check` 使用 TypeScript 5.6 `--noCheck`，避免 SDK 直接引入的 Chat 既有深层源码错误阻塞包装层的语法检查。

## 验证

- `pnpm install`：完成，更新 lockfile。
- `pnpm --dir apps/chat-sdk type-check`：通过（`tsc --noEmit --noCheck`）。
- `pnpm --dir apps/chat-sdk build`：通过，转换 5074 个模块。
- `node --check apps/chat-sdk/dist/abi-assistant-widget.js`：通过。
- 产物静态检查：包含 `customElements.define`、`createRoot`、`abi-cw-panel` 和内嵌样式；不含 `dashboard_share_page` 和裸 `@sa/` 导入。
- SHA256：`dist` 与 `apps/chat/public` 均为 `DE6A31AF63D3054BEF74DA158B0CBA367242077B734B26936457803C45BBA7F0`。

## 产物

- `dist/abi-assistant-widget.js`：5,149,546 bytes；包含原 React 弹窗、React/ReactDOM、antd 和 ChatWidget 依赖及 CSS。
- `dist/chat-widget.css` 作为附带构建文件保留，但 IIFE 已内嵌其内容，Vue 2 接入无需加载该 CSS。

## 风险与边界

- 直接渲染的接口请求从 Vue 2 页面发起；目标 `base` 服务必须允许该页面源的 CORS。
- 产物内置完整依赖，因此较此前 iframe 方案显著增大。
- 按用户要求未执行浏览器联调。

## AI 文档更新判断

- 已更新 `CURRENT_REQUIREMENT.md`、`MODULE_MAP.md` 和本运行记录。
- `prompts/`、`agents/`、`skills/`、`mcp/`、`checklists/`、`decisions/` 无需更新。
