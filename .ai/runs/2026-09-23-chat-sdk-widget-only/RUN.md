# Run Log：chat-sdk 精简为助手分享页悬浮窗 SDK（JS + CSS 双产物）

## 基本信息

- 日期：2026-09-23
- 任务名称：chat-sdk-widget-only
- 需求来源：用户对话需求（精简 `apps/chat-sdk`，统一输出 JS + CSS，仅保留 `<abi-assistant>` 标签接入）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Planner、Developer、Test、Regression
- 任务类型：SDK 精简 / 构建产物调整

## 需求摘要

第三方系统通过 ABI 服务端 SDK 请求悬浮窗资源；ABI 侧用 pnpm 构建统一输出 JS + CSS。`apps/chat-sdk` 只保留助手分享页悬浮窗代码与相关逻辑，其余删除，并保证以下方式可直接接入：

```html
<script src="./abi-assistant-widget.js"></script>
<abi-assistant share-code="rkh7lyn8" base="https://192.168.1.195"></abi-assistant>
```

用户确认的取舍：CSS 独立成文件（JS + CSS 两文件）；对外只保留自定义标签，去掉 `AbiAssistant.init()` 命令式 API 与 ESM/d.ts 产物；保留一个示例页。

## 影响范围

- `apps/chat-sdk/**`（仅本子项目）
- `apps/chat/public/abi-assistant-widget.js`、`apps/chat/public/abi-assistant-widget.css`（构建自动同步产物）

## 修改文件

- `apps/chat-sdk/src/index.ts`：重写，仅注册 `abi-assistant` 标签；按 `document.currentScript.src` 自动 `<link>` 同目录 `abi-assistant-widget.css`（已有同名 link/style 则跳过）
- `apps/chat-sdk/src/AbiAssistant.tsx`（新增，React）：悬浮球 + 面板开关状态；面板关闭退回悬浮球可再次唤起；`open` 属性控制初始展开
- `apps/chat-sdk/src/launcher.css`（新增）：悬浮球样式，与面板同主题渐变与 z-index
- `apps/chat-sdk/src/element.ts`（新增，替代 widget.tsx）：`HTMLElement` 子类仅作标签↔React 桥，属性透传为 props，不含交互状态
- `apps/chat-sdk/vite.config.ts`：仅 IIFE 格式；`cssFileName` 固定为 `abi-assistant-widget`；移除 d.ts 生成与"CSS 注入 JS"步骤；closeBundle 把 JS + CSS 复制到 `apps/chat/public/`，把 `index.html` 复制到 `dist/`
- `apps/chat-sdk/package.json`：删除 main/module/types/exports/publishConfig，`private: true`；依赖收敛为 `src/` 实际 import 的 14 个运行时包；新增 `preview` 脚本
- `apps/chat-sdk/index.html`：改为第三方接入示例页（写法与线上接入一致）
- `apps/chat-sdk/src/vite-env.d.ts`：删除已无引用的 `*.css?inline` 声明
- 删除：`src/widget.tsx`（open/close/toggle 状态逻辑已移入 React 组件）、`src/env.ts`（iframe 时代残留 `buildShareUrl`）、`prune-chat.mjs`、`trace-closure.mjs`、`standalone.html`
- 未删：`src/chat/assets/chart-thumbs/*` 17 张缩略图全部被 `chartTypeCatalog.ts` 引用（图表类型切换弹窗与占位图）；依赖闭包扫描确认 `src/` 91 个文件全部可达

## 实现说明

- 产物固定为两文件：`dist/abi-assistant-widget.js`（IIFE，约 5.05MB / gzip 1.79MB）+ `dist/abi-assistant-widget.css`（约 94KB / gzip 17KB）。
- 第三方只需一个 `<script>`：JS 加载时按自身 URL 推导并注入同目录 CSS 的 `<link>`；也允许宿主手动 `<link>`，不会重复加载。
- 分层：`element.ts`（浏览器要求自定义元素必须是 HTMLElement 子类，此层不可省）→ `AbiAssistant.tsx`（React：悬浮球/面板开关）→ `ChatWidget`（分享页对话面板）。
- `src/chat/` 为 ChatWidget 依赖闭包副本，本次未改动其业务逻辑。

## 测试记录

### 执行的命令

- `pnpm --dir apps/chat-sdk build`
- `pnpm --dir apps/chat-sdk type-check`
- `pnpm --dir apps/chat-sdk exec vite preview --port 5201 --strictPort`

### 测试结果

- build 成功（二轮），`dist/` 仅含 `abi-assistant-widget.js`（5.06MB）、`abi-assistant-widget.css`（94KB，含 `.abi-cw-launcher`）；`chat/public` 中两文件 SHA256 与 dist 一致。后续又删掉示例页，`dist/` 仅余 JS+CSS 两个文件。
- type-check 通过（`--noCheck`，与既有约定一致）。
- 接入演示：验证期间临时建过 `trust-abi-web/widget-demo/`（纯 HTML + Vue 2.7）与 chatbi/abi 首页注入，均已删除；apps/chat-sdk/index.html 示例页也已删除（同步去掉 vite.config.ts 的复制步骤与 package.json 的 preview 脚本）。
- 浏览器端标签渲染验证：用户在 apps/abi 首页以 `<script src>` + `<abi-assistant share-code base="/api">` 接入验证通过（走 vite 代理同源）。验证后测试代码已全部清除：abi index.html/home 恢复、abi/public 与 chatbi/public 产物副本删除、widget-demo 目录删除、chatbi 首页接入代码恢复。产物只保留 dist/ 与 apps/chat/public/。
- 跨域结论：第三方页面直连网关属非简单请求（Authorization + JSON），需 195 网关对接口 location 返回 CORS 头；SDK 侧无法绕过，本仓库未改动 nginx。

### 失败和修复过程

- 根目录 `pnpm preview` 因递归执行未命中脚本；改用 `pnpm --dir apps/chat-sdk ...`。5199 端口被占用，改用 5201。
- 纯 HTML 接入后页面无悬浮球：产物内残留 596 处 `process.env.NODE_ENV`（Vite lib 模式默认不替换，留给下游打包器），浏览器无 `process` 导致脚本开头即抛 ReferenceError。修复：vite.config.ts 增加 `define: { 'process.env.NODE_ENV': '"production"' }`；重建后残余 2 处均有 `typeof process` 守卫，JS 体积 5.06MB → 4.45MB。

## 回归检查

- `apps/chat/public/` 旧的 `abi-assistant-widget.js`（CSS 内嵌版）被新版覆盖；新版依赖同目录 `abi-assistant-widget.css`，已一并复制。
- 未改动 `apps/chat` 源码；`src/chat/` 业务副本未改动。

## 发现的问题

- `chat/public` 若被单独部署，必须同时带上 `.css`，否则悬浮窗无样式。

## 本轮经验

- Vite 6 lib 模式用 `build.lib.cssFileName` 即可控制 CSS 产物名，无需 `assetFileNames`。
- `vite preview` 只服务 `outDir`，示例页需随构建复制进 `dist/`。

## 是否需要更新 AI 系统

### 需要更新的 context

`.ai/context/MODULE_MAP.md` 若记录 chat-sdk 的 ESM/init API，应改为"仅标签 + JS/CSS 双产物"。

### 需要更新的 prompts / agents / skills / MCP 建议

无。

### 需要更新的 checklists

无。

## 后续建议

- 服务端 SDK 下发悬浮窗资源时需同时暴露 `.js` 与 `.css` 两个路径。

## 未解决问题

- 浏览器端渲染验证未由自动化完成。
