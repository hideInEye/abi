# 📘 基础信息层

- **项目名称**：`xd` 前端工程模板，面向多应用（Portal/Admin）场景的 React Monorepo。
- **定位概述**：借助 Vite + pnpm + Turborepo 构建的现代前端脚手架，内置 Tailwind CSS 4 与 TanStack 技术栈，支持快速扩展子应用与共享配置包。
- **核心特性**：一体化依赖管理、约定式路由、可复用的工程配置、严格的代码规范、预置微前端占位模块。
- **主要技术栈**：React 18、Vite 5、TypeScript 5、TanStack Router 1、TanStack Query 5、Tailwind CSS 4、pnpm 9、Turborepo、Vitest、ESLint + Prettier。

# 🧱 工程层

- **目录概览**
  ```bash
  .
  ├─ apps/
  │  ├─ portal/          # 前台门户应用（Vite + React + TanStack Router）
  │  └─ admin/           # 管理端占位，等待补充业务
  ├─ packages/
  │  ├─ config/          # 共享运行时配置（如 API_BASE）
  │  ├─ charts/          # React 图表占位组件
  │  ├─ config-tailwind/ # Tailwind & PostCSS 共享配置
  │  └─ config-tsconfig/ # TypeScript 基础 tsconfig
  ├─ commitlint.config.cjs
  ├─ turbo.json
  └─ pnpm-workspace.yaml
  ```
- **工程化能力**
  - **包管理**：pnpm workspaces + `pnpm-workspace.yaml` 控制包范围。
  - **任务编排**：`turbo.json` 定义 build/test/lint 等任务依赖，默认开启构建缓存。
  - **代码规范**：自研 `@xd/eslint-config-base`（严格 TS 规则 + React + TanStack Query），配合 Prettier、Husky、lint-staged、Commitlint、Commitizen。
  - **类型管理**：所有子包共享严格模式 TS 配置，`packages/config-tsconfig` 统一路径别名与编译选项。
  - **样式体系**：Tailwind 4 官方插件 + 自定义主题，Portal 通过 `@import 'tailwindcss'` 直接启用。
  - **测试能力**：全局脚本 `pnpm test` 调用 Vitest；Portal 默认启用 JSDOM、Testing Library。

# ⚙️ 使用层

- **环境要求**：Node ≥ 18.18.0、pnpm ≥ 8.10.0（推荐 9.12.3，与仓库锁定版本一致）。
- **安装依赖**
  ```bash
  pnpm install
  ```
- **常用脚本（根目录）**
  - `pnpm dev:portal` / `pnpm dev:admin`：启动指定子应用（当前 admin 未实现 UI）。
  - `pnpm build:packages`：构建所有 `packages/*`。
  - `pnpm lint` / `pnpm format`：代码规范检查与格式化。
  - `pnpm type-check`：Typescript 严格类型检查。
  - `pnpm test` / `pnpm test:ui`：Vitest 覆盖率运行与 UI 调试界面。
- **Portal 应用独有脚本**
  ```bash
  pnpm --filter portal dev        # 开发模式
  pnpm --filter portal build      # 构建产物输出到 dist
  pnpm --filter portal preview    # 本地预览
  pnpm --filter portal test       # 单元与组件测试
  pnpm --filter portal lint       # 局部 ESLint
  ```
- **共享配置使用**
  - Tailwind：在子应用 `tailwind.config.*` 中通过 `presets: [config]` 引入 `@xd/config-tailwind`。
  - TypeScript：通过 `extends: "@xd/config-tsconfig/tsconfig.base.json"` 复用基础配置，并按需覆盖 `compilerOptions`。
  - 运行时常量：`import { API_BASE } from '@xd/config'`，默认读取 `VITE_API_BASE`，未设置时回退 `/api`。

# 🚀 扩展层

- **新增子应用**
  1. 在 `apps/` 下创建目录并初始化 `package.json`，继承 `@xd/config-tsconfig`、`@xd/config-tailwind`。
  2. 在根 `package.json` 中追加脚本（如 `dev:newapp`），借助 Turborepo/ pnpm filter 管理任务。
  3. 可沿用 Portal 的 Vite + TanStack Router 方案，只需保持 workspace 规范。
- **扩展共享包**
  - `packages/` 目录建议按功能域拆分（如 `utils`、`ui`、`hooks`），通过 `package.json` `exports` 字段控制入口。
  - 若需发布到私有 npm，可在包内配置 `publishConfig.access`，并完善 `files` 白名单。
- **微前端/远程模块预留**
  - 微前端暂未实现
- **CI/CD 建议**
  - 基于 Turborepo pipeline，将 `pnpm install`、`pnpm build:packages`、`pnpm --filter portal build`、`pnpm test` 串联。
  - 使用缓存目录 `.turbo` 提升 CI 构建速度，根据部署平台配置持久化。

# 🧩 附录层

- **环境变量**
  - `.env`（根目录）可统一定义 `VITE_*` 变量，由 Vite 注入前端；`packages/config` 会自动读取 `VITE_API_BASE`。
  - 构建时通过 `define.__BUILD_TIME__` 注入构建时间戳，可用于版本展示。
- **约定与提示**
  - 提交信息需符合 Conventional Commits，建议执行 `pnpm commit` 调用 Commitizen。
  - ESLint 限制默认导出，仅在 `src/pages/**` 等路径允许（详见 `packages/config-eslint/index.js`）。
  - Tailwind 内容扫描范围覆盖 `apps/**/*` 与 `packages/**/*`，避免在其他目录存放 JSX/TSX。
