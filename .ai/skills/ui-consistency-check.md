# UI Consistency Check

## 当前项目执行示例

当前项目有 UI，且三套样式系统不同：

- ABI：`apps/abi`，Ant Design + UnoCSS + SCSS/CSS variables，入口 `apps/abi/src/styles/css/global.css`、`apps/abi/uno.config.ts`。
- Chat：`apps/chat`，Tailwind + `apps/chat/src/index.css` glassmorphism variables。
- Dashboard：`apps/dashboard`，Less + Ant Design + 设计器样式，入口 `apps/dashboard/src/index.less`。

检查方式：

1. 启动目标 app。
2. 检查 desktop/mobile 视口。
3. ABI 不引入 Tailwind；Chat 不引入 UnoCSS；Dashboard 不破坏画布/面板结构。
4. 检查 loading/empty/error。
5. 必要时用 browser/Playwright 截图。

## 空白模板版

写明目标 app、组件路径、样式系统、视口、截图、问题和修复建议。
