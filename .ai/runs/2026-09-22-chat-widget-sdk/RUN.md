# RUN: 浮窗助手 SDK 化（chat-sdk 改造为 @abi/chat-widget）

- 日期：2026-09-22
- 目录：`apps/chat-sdk`（包名由 `@abi/chat-sdk` 改为 `@abi/chat-widget`）

## 目标

- 用户只要「浮窗」这一层，且要把手写的 `abi-assistant-widget.js` 改成源码开发、命令构建的 SDK。
- 复用 `apps/chat-sdk` 目录，删除原 React 聊天内容本体，改造成纯浮窗 SDK。
- 对外同时暴露 Web Component `<abi-assistant>` 与 JS API `AbiAssistant.init({...})`。

## 非目标

- 不再维护 React 深度集成包（原 chat-sdk React 内容整体删除）。
- 不改动 `apps/chat` 的分享路由与 `chat-widget` 组件逻辑。

## 实现

1. 清理：删除 `apps/chat-sdk/src`（158 个 React 文件）、`dist`、`scripts`、`tailwind.config.js`、旧 tarball。
2. 新源码（原生 TS，零运行时依赖）：
   - `src/env.ts`：`document.currentScript.src` 推导线上 Chat 基址；`buildShareUrl` 生成 `#/dashboard_share_page/:shareCode?embed=1`。
   - `src/icons.ts`：内联 SVG（chat/close/maximize/restore）。
   - `src/style.css`：Shadow DOM 内样式（唤起按钮、面板、头部拖拽、最大化、移动端、inline 模式）。
   - `src/widget.ts`：`AbiAssistantElement`，Shadow DOM 隔离；打开/关闭/切换、拖拽、最大化（显式像素）、iframe 懒加载、属性同步、`abi-open/close/maximize/restore` 事件。
   - `src/index.ts`：`define()` 幂等注册 + `init(options)` 命令式挂载（返回 open/close/toggle/setShareCode/destroy），脚本加载即自动注册标签；命名 + 默认导出。
3. 构建配置 `vite.config.ts`：lib 模式，`formats: ['iife','es']`，`abi-assistant-widget.js`(IIFE, 全局 `AbiAssistant`) + `index.es.js`；CSS 经 `?inline` 内联进 JS（单文件）；`output.exports:'named'`；`generateBundle` 产出 `index.d.ts`；`closeBundle` 自动复制到 `apps/chat/public/`。
4. `package.json`：重命名 `@abi/chat-widget`，去掉全部 React/antd/redux 等依赖，仅留 vite/typescript/@types/node；`exports` 提供 `.`(ESM+types) 与 `./widget`(单 JS)。
5. `tsconfig.json`：移除 @sa/react 别名与 jsx，恢复 `strict`。

## 验证

- `pnpm --filter @abi/chat-widget type-check`：通过（strict 下无错误）。
- `pnpm --filter @abi/chat-widget build`：通过，无警告。
  - `dist/abi-assistant-widget.js` 11875 bytes（gzip ~4KB）
  - `dist/index.es.js` 13522 bytes、`dist/index.d.ts` 770 bytes
- `node --check dist/abi-assistant-widget.js`：语法 OK。
- 产物含 `customElements.define`、`abi-assistant`、`dashboard_share_page`、`embed=1`、`currentScript`、`attachShadow`；全局导出 `init/define/TAG_NAME/AbiAssistant/default`。
- 自动复制到 `apps/chat/public/abi-assistant-widget.js`（11875 bytes 一致）。
- `pnpm install`：workspace 同步成功（peer 警告为 apps/chat 既有，无关）。

## 未验证 / 风险

- 未做真实浏览器 iframe 联调；线上加载受目标域名 CSP `frame-ancestors`、`X-Frame-Options` 与接口环境限制。
- 未运行 apps/chat 全量构建（public→dist 复制为 Vite 标准行为，本会话此前已验证）。

## 交付使用

```html
<script src="https://线上域名/chat-ui/abi-assistant-widget.js"></script>
<!-- 用法一：HTML 标签 -->
<abi-assistant share-code="rkh7lyn8" open></abi-assistant>
<!-- 用法二：JS API -->
<script>
  window.AbiAssistant.init({ shareCode: 'rkh7lyn8', open: true })
</script>
```

## AI 资产更新

- 更新 `.ai/context/MODULE_MAP.md`：修订 apps/chat 关于 widget.js 来源的描述，新增 `apps/chat-widget` 模块条目。
