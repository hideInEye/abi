# UI Style Guide

## 总体原则

本项目包含 UI，且三套 app 的样式系统不同。后续开发必须按所属 app 维护一致性，不要把一个 app 的视觉规则硬套到另一个 app。

## apps/abi

- UI 框架：Ant Design 5，证据 `apps/abi/package.json`、`apps/abi/src/App.tsx`。
- 样式方案：UnoCSS、SCSS、全局 CSS、Ant Design cssVar。证据 `apps/abi/uno.config.ts`、`apps/abi/src/plugins/assets.ts`、`apps/abi/src/styles/css/global.css`。
- 主题系统：Redux `themeSlice` + `theme/settings.ts` + `theme/vars.ts`，运行时注入 CSS variables。
- 颜色：默认主题色 `#3366ff`，全局 ABI v5 变量包含 `--abi-card-bg`、`--abi-panel-bg`、`--abi-input-bg` 等。
- 字体：Ant Design token 中使用 Microsoft YaHei、PingFang SC、系统 sans-serif。
- 间距/布局：侧边栏、tab、header 高度由 `themeSettings` 管理；Uno shortcuts 包括 `f-v`、`f-v-b`、`card-wrapper`。
- 状态组件：`GlobalLoading`、`TableEmpty`、Ant Design message/modal/drawer。
- 图标：Iconify、vite-plugin-svg-icons，本地图标由 `VITE_ICON_LOCAL_PREFIX` 和 SVG assets 支持。
- 规则：新增 ABI 页面优先使用 Ant Design + 当前主题变量 + UnoCSS shortcuts，不要新建孤立视觉体系。

## apps/chat

- UI 框架：Ant Design + 自定义聊天组件。
- 样式方案：Tailwind CSS + `src/index.css` 自定义 CSS variables。
- 颜色：以 glassmorphism 变量为主，如 `--accent: #5b7cf7`、`--accent-2: #8b5cf6`、`--danger`、`--success`。
- 字体：`--font` 使用 SF Pro Display、PingFang SC、Microsoft YaHei 等。
- 布局：`body` 全屏、渐变背景，聊天输入、侧边栏、内容区有 glass 类。
- 图标：本地 SVG sprite，证据 `apps/chat/vite.config.ts` 的 `createSvgIconsPlugin` 和 `src/assets/svg-icon`。
- 规则：聊天体验优先保持现有 glass/card/input toolbar 风格；新增按钮尽量使用图标或 Ant Design 组件并与现有 CSS 变量一致。

## apps/dashboard

- UI 框架：Ant Design + 设计器自定义组件。
- 样式方案：Less，证据 `apps/dashboard/src/index.less` 和 `apps/dashboard/src/designer/**/*.less`。
- 主题：`MainRouter.tsx` 中存在大量 Ant Design theme token 注释配置；当前实际运行主题需结合文件后半部分确认。
- 布局：设计器是多面板/画布/配置区结构，涉及 ruler、moveable、selecto、blueprint、undo/redo。
- 字体：全局 CSS 使用系统 sans-serif，设计器资源下有字体文件 `apps/dashboard/src/designer/resource/font`。
- 规则：设计器 UI 修改必须检查画布缩放、拖拽、热键、层级和右侧配置面板，不要把 dashboard 当普通表单页处理。

## Loading / Empty / Error

- ABI 表格 empty 通过 `renderEmpty` 指向 `TableEmpty`。
- ABI 全局 loading 通过 `GlobalLoading` 和 loading slice。
- Chat config 加载失败用 `message.error('获取配置文件失败')`。
- Dashboard 请求失败通常通过 `FetchUtil` 返回 `{ code, msg, data }`，调用方需处理。

## 响应式规则

当前仓库未发现统一响应式规范文档，建议后续人工确认。新增 UI 应遵循所属 app 现有布局和 Ant Design/Tailwind/UnoCSS 响应式能力。

## 禁止破坏的视觉一致性规则

1. 不要在 ABI 中引入与 `themeSettings` 和 `global.css` 冲突的新主题变量。
2. 不要在 chat 中绕过 `index.css` 变量写大量孤立色值。
3. 不要在 dashboard 设计器区域使用普通后台页面布局替代画布/面板结构。
4. 不要跨 app 混用 UnoCSS/Tailwind/Less 规则。
