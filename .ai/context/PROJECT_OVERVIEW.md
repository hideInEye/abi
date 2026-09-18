# Project Overview

## 一句话说明

这是一个基于 pnpm workspace 和 Turbo 的 React/Vite 前端 monorepo，包含主业务管理端 `apps/abi`、聊天子应用 `apps/chat`、大屏设计器 `apps/dashboard`，以及一组共享 `packages/*`。

## 项目类型

- 前端 monorepo。
- 多应用 + 共享包结构。
- `apps/abi` 是主应用；`apps/dashboard` 由 ABI 通过 qiankun 动态加载；`apps/chat` 当前通过 `/chat-ui/` 作为独立 SPA 运行，其 qiankun 入口仅保留兼容空实现。

## 技术栈

- React 18：`apps/abi/package.json`、`apps/chat/package.json`、`apps/dashboard/package.json`。
- Vite：`apps/abi/vite.config.ts`、`apps/chat/vite.config.ts`、`apps/dashboard/vite.config.ts`。
- TypeScript：各 app/package `tsconfig.json`。
- Ant Design 5：`apps/abi/package.json`、`apps/chat/package.json`、`apps/dashboard/package.json`。
- Redux Toolkit：`apps/abi/src/store/index.ts`、`apps/chat/src/store/redux/index.ts`。
- Zustand：`apps/chat/src/store/index.ts`。
- MobX：`apps/dashboard/package.json`、`apps/dashboard/src/designer/store/RuntimeStore.ts`。
- React Router / 自研 simple-router：`packages/simple-router/src/router.ts`、`apps/abi/src/router/index.ts`。
- TanStack Router：`apps/chat/src/router/index.tsx`。
- UnoCSS / SCSS / CSS variables：`apps/abi/uno.config.ts`、`apps/abi/src/styles/css/global.css`。
- Tailwind CSS：`apps/chat/tailwind.config.js`、`apps/chat/src/index.css`。
- Less：`apps/dashboard/src/index.less` 和 dashboard 多处 `.less` 文件。

## 包管理器

- `pnpm`，根 `package.json` 声明 `packageManager: pnpm@9.12.3`。
- workspace 范围由 `pnpm-workspace.yaml` 和根 `package.json` 的 `workspaces` 指定。

## 主要业务目标

从目录和 API 命名看，主业务集中在数据分析、智能问答、数据准备、本体知识图谱、助手管理、系统管理、应用/API key/插件/模型/技能管理等模块。证据包括 `apps/abi/src/pages/workbench/*`、`apps/abi/src/pages/component/*`、`apps/chat/src/components/conversation/*`。

## 主要用户流程

- 主应用登录、空间选择、权限路由：`apps/abi/src/pages/login`、`apps/abi/src/pages/space-list`、`apps/abi/src/router/guard/index.ts`。
- 数据工作台：`apps/abi/src/pages/workbench/data-preparation`。
- 本体知识图谱：`apps/abi/src/pages/workbench/ontology-kg`。
- AI 对话/分析：`apps/chat/src/components/conversation`、`apps/chat/src/pages/chat`。
- 大屏设计与预览：`apps/dashboard/src/designer`、`apps/dashboard/src/pages/designer`、`apps/dashboard/src/pages/view`。

## 主要目录

- `apps/abi`：主 React 管理端，含路由、主题、请求、Redux、业务页面。
- `apps/chat`：聊天/分析子应用，TanStack Router、Zustand、Tailwind。
- `apps/dashboard`：大屏设计器和组件库，React Router、MobX、Less。
- `packages/auth`：通用 token、Authorization header 和登录过期流程。
- `packages/axios`：通用 axios 请求工厂、请求取消、重试、错误分层。
- `packages/simple-router`：基于 React Router 的路由适配层。
- `packages/hooks`、`packages/materials`、`packages/color`、`packages/utils`：共享 hooks、布局组件、颜色和工具函数。
- `nginx`、`dockerfile`、`docker-compose.yml`：部署配置。

## 关键入口文件

- 根配置：`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`Makefile`。
- 主应用：`apps/abi/src/main.tsx`、`apps/abi/src/App.tsx`、`apps/abi/vite.config.ts`。
- 聊天独立应用：`apps/chat/src/main.tsx`、`apps/chat/src/App.tsx`、`apps/chat/vite.config.ts`。
- 大屏设计器：`apps/dashboard/src/index.tsx`、`apps/dashboard/src/router/MainRouter.tsx`、`apps/dashboard/vite.config.ts`。

## 构建和运行方式

- 根开发：`pnpm dev`，执行 `turbo run dev`。
- 根构建：`pnpm build`，执行 `turbo run build --filter=./apps/*`。
- 主应用开发：`pnpm --filter chatbi dev`。
- 聊天子应用开发：`pnpm --filter ai-bot dev`。
- dashboard 开发：`pnpm --filter abi-dashboard dev`。
- package 构建：`pnpm build:packages`。

## 当前证据来源

- 根：`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`Makefile`、`.prettierrc`。
- app：`apps/abi/package.json`、`apps/chat/package.json`、`apps/dashboard/package.json`。
- 路由/启动：`apps/abi/src/main.tsx`、`apps/abi/src/router/index.ts`、`apps/chat/src/router/index.tsx`、`apps/dashboard/src/router/MainRouter.tsx`。
- 请求/鉴权：`apps/abi/src/service/request/index.ts`、`apps/abi/src/utils/auth.ts`、`apps/chat/src/service/request/index.ts`、`apps/dashboard/src/utils/FetchUtil.ts`、`packages/auth/src/index.ts`、`packages/axios/src/index.ts`。
- 测试：`package.json`、`apps/abi/src/pages/workbench/ontology-kg/*.test.ts`。

## 未确认事项

- 当前仓库未发现根 `README.md`，`git status` 显示多个 README/ref-request 文件处于删除状态，建议后续人工确认是否为预期。
- 当前仓库未发现 `.github/workflows`，CI/CD 流程建议人工确认。
- 后端接口协议没有集中 OpenAPI/Swagger 文件，API 细节主要散落在 `apps/abi/src/service/api/*` 和 `apps/chat/src/service/api/*`。
