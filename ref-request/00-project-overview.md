# 00｜项目整体认知（全局扫描）

> 目标：形成对当前代码库的“真实画像”，用于指导后续改造优先级与演进路线。

## 1. 项目定位与复杂度判断

- **形态**：pnpm + Turborepo 的 Monorepo；包含两个前端应用（`apps/abi`、`apps/chat`）以及一组内部共享包（`packages/*`）。
- **微前端**：两端应用均集成 `vite-plugin-qiankun`，具备作为 qiankun **子应用**运行的能力（均有 `renderWithQiankun` 生命周期代码）。
- **部署形态线索**：`nginx/abi.conf` 里把 `/` 作为 `abi` 静态站点入口，同时把 `chat` 作为 `/chat-ui/` 站点/代理入口（实际“主/子”关系可能依赖外部容器应用，需与运行环境确认）。
- **复杂度**：
  - `apps/abi`：典型中后台/平台型系统（路由多、模块多、权限与菜单、i18n、主题、KeepAlive 等能力齐全）。
  - `apps/chat`：单页对话/分析应用，但内部包含大量重逻辑组件（对话流、SSE、图表、录音、截图、富文本等），复杂度并不低。

## 2. 技术栈合理性（与当前真实代码对齐）

### 2.1 当前真实技术栈

- **框架**：React 18 + TypeScript
- **构建**：Vite（`apps/abi` 为 Vite 5，`apps/chat` 为 Vite 6）
- **UI**：
  - `apps/abi`：Ant Design + UnoCSS（含自定义 `@sa/materials`）
  - `apps/chat`：Ant Design + Tailwind（版本与根/其他处不一致）
- **路由**：
  - `apps/abi`：`@sa/simple-router`（底层依赖 `react-router-dom@6`），且引入 `elegant-router` 生成路由
  - `apps/chat`：直接使用 `react-router-dom@7`
- **状态管理**：
  - `apps/abi`：Redux Toolkit + 局部 Zustand（`src/my-store`）
  - `apps/chat`：Zustand（debug）+ Redux Toolkit（但 Provider 被注释，存在“代码在但没跑”的债务）
- **数据请求**：
  - `apps/abi`：基于内部包 `@sa/axios` 的 request 封装
  - `apps/chat`：直接 axios + 拦截器

### 2.2 README / 脚手架信息存在失真

- 根 `README.md` 描述的 `apps/portal`、`apps/admin`、TanStack Router 等与当前仓库实际结构不一致。
- 根 `package.json` 脚本仍保留 `dev:portal`/`dev:admin` 等，但仓库内不存在对应 workspace。

结论：当前仓库已从模板演化出真实业务，但“工程描述层”未同步更新，造成新成员理解成本与误操作风险。

## 3. 目录结构与模块边界（现状画像）

### 3.1 apps/abi

目录以“技术类型”组织为主：`components/ hooks/ pages/ service/ store/ utils/ layouts/ router/`。

主要问题迹象：

- **跨层依赖**：`service/api` 直接引用 `pages/**/types`（例：`apps/abi/src/service/api/dictionary.ts`），导致 service 层依赖 UI 层。
- **跨包直连源码**：大量 `~/packages/**/src` 导入（例：`apps/abi/src/layouts/base-layout/BaseLayout.tsx`），绕过包 `exports`，破坏单向依赖与发布边界。

### 3.2 apps/chat

整体更偏“应用内直连”结构：`pages/ components/ service/ store/ utils/`。

主要问题迹象：

- 对话页（`pages/conversation/*`）呈现“巨型组件”特征（状态变量、分支、边界处理集中在一个文件/目录内）。
- request 层存在硬编码 token 与运行时配置混用，且缺少统一的类型与错误策略。

## 4. 路由/菜单/Layout 体系（概要）

- `apps/abi` 路由来自 `elegant-router` 生成文件（`apps/abi/src/router/elegant/routes.ts`），菜单由路由派生（`MenuProvider` + `getGlobalMenusByAuthRoutes`），总体方向正确。
- Layout 体系较重（`BaseLayout` + 多 modules），并且存在部分能力“代码存在但被注释”的情况（如 KeepAlive、ErrorBoundary、Redux/Tab 等），需要明确取舍并清理债务。

## 5. 初步结论

该仓库属于“真实运行项目 + 模板/多方案残留”叠加态，短期的主目标应是：

1) **止血**：安全/正确性问题清零（硬编码 token、权限/登录逻辑漏洞、生命周期泄漏）。
2) **收口边界**：禁止跨包源码引用、治理 service 与页面层耦合。
3) **做强工程底盘**：统一构建/依赖策略、建立可度量的性能与质量指标。

