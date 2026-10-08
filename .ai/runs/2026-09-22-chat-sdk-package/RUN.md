# 独立 React Chat SDK npm 包

## 目标

新增与 `apps/chat`、`apps/dashboard` 同级的 `apps/chat-sdk`，保留原 `apps/chat` 实现，并将助手对话组件依赖源码复制到独立项目用于 npm 包测试。

## 变更

- 新增 `apps/chat-sdk` 独立 workspace 项目。
- 从 `apps/chat` 复制 SDK 实际依赖的 90 个源码文件及 SVG 图标资源。
- SDK 导出 `AbiAssistant` React 组件和 `mount` 命令式 API。
- `apiBase` 由 SDK 属性传入，并同步到运行时配置供复用接口使用。
- 构建输出 ESM、CommonJS、CSS 和 TypeScript 声明。
- 更新 `pnpm-lock.yaml`，加入新 workspace importer。
- 未删除或覆盖 `apps/chat` 原实现及其他未提交业务改动。

## 验证

- `pnpm --filter @abi/chat-sdk build`：通过，转换 5041 个模块。
- `pnpm --filter @abi/chat-sdk type-check`：通过。
- `pnpm --dir apps/chat-sdk pack`：通过，生成 `abi-chat-sdk-0.1.0.tgz`。
- tarball 内容检查：仅包含 `dist/index.es.js`、`dist/index.cjs`、`dist/index.d.ts`、`dist/style.css` 和 `package.json`。

## 产物

- `apps/chat-sdk/dist/index.es.js`
- `apps/chat-sdk/dist/index.cjs`
- `apps/chat-sdk/dist/index.d.ts`
- `apps/chat-sdk/dist/style.css`
- `apps/chat-sdk/abi-chat-sdk-0.1.0.tgz`

## 风险与后续

- React 与 ReactDOM 为 peerDependencies，宿主需提供 React 18 或 19。
- SDK 直接从宿主页面请求后端；跨域部署需要后端允许宿主域名 CORS，或由宿主配置同源代理。
- 当前为验证期复制版本；若 SDK 定稿并替代 `apps/chat` 原实现，再统一源码归属并更新 `MODULE_MAP.md` 与架构说明，避免长期双份维护。

## 旧 SDK 清理与跨项目验证

- 已删除 `apps/chat/vite.config.sdk.ts`、`apps/chat/src/sdk/index.tsx`、旧 SDK JS/CSS 产物及 `apps/chat/package.json` 中的 `build:sdk` 脚本。
- `pnpm --filter @abi/chat-sdk type-check`：通过。
- `pnpm --filter @abi/chat-sdk build`：通过，转换 5041 个模块。
- `pnpm --dir apps/chat-sdk pack`：通过；tarball 仅包含 ESM、CommonJS、类型声明、CSS 和 package.json。
- ESM 产物仅保留 React、ReactDOM 和 JSX runtime 外部导入，不包含 `@sa/*`、monorepo 相对路径或 `virtual:svg-icons-register`，可供其他浏览器端 React 18/19 项目安装使用。
