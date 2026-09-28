# RUN: 浮窗 SDK 外壳样式对齐

- 日期：2026-09-23
- 范围：`apps/chat-sdk`

## 目标

- 将 Web Component 浮窗外壳对齐 `apps/chat/src/components/chat-widget` 的既有视觉。
- 保持 Vue 2 的 `<script>` + `<abi-assistant>` 接入方式和 iframe 行为不变。

## 修改

- `src/style.css`：面板对齐原 ChatWidget 的响应式尺寸、16px 圆角、浅边框与柔和阴影；外壳不再自绘标题栏，改为 52px 透明控制条叠在 iframe 自带标题栏上（右对齐最大化/关闭，灰色图标、悬停变主色）；唤起按钮使用蓝紫渐变。
- `src/widget.ts`：删除自绘 logo/标题节点与 `title` 属性处理，header 仅保留拖拽热区与操作按钮。
- `src/index.ts`、`vite.config.ts`：同步移除 `title` 选项与声明。
- 构建后同步 `apps/chat/public/abi-assistant-widget.js` 与 chatbi 测试项目的 public 副本。

## 验证

- `pnpm --dir apps/chat-sdk type-check`：通过。
- `pnpm --dir apps/chat-sdk build`：通过；IIFE 产物 11.55 kB，gzip 3.95 kB。
- `node --check apps/chat-sdk/dist/abi-assistant-widget.js`：通过。
- `dist`、`apps/chat/public`、chatbi public 三处 SHA256 均为 `894F6CEAC7934D712791E7BA0961E873F8033B8C42100BAE473CBAC25BA8A82B`。
- 按用户要求未执行浏览器测试；用户 Vue2 项目需重新复制新 JS 后验证。

## 回归与风险

- 属性协议、iframe URL、打开/关闭、拖拽、最大化和 Vue 2 接入方式未修改。
- 本轮只对齐 SDK 外层容器；iframe 内部仍由线上 Chat 分享页渲染。

## AI 文档更新判断

- `requirements/CURRENT_REQUIREMENT.md`：已追加本轮目标、非目标和验收要求。
- `context/`、`prompts/`、`agents/`、`skills/`、`mcp/`、`checklists/`、`decisions/`：无需更新，本轮没有新增架构或流程规则。
