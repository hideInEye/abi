# Build And Run

## 环境要求

- Node >= 18.18.0，根 `package.json`。
- pnpm >= 8.10.0，根 `package.json`。
- 根 `.nvmrc` 存在，内容为 `20`。

## 根命令

- 安装依赖：`pnpm install`
- 开发：`pnpm dev`
- 构建 apps：`pnpm build`
- 构建 packages：`pnpm build:packages`
- 测试：`pnpm test`
- 测试 UI：`pnpm test:ui`
- 类型检查：`pnpm type-check`
- Lint：`pnpm lint`
- 格式化：`pnpm format` 或 `pnpm prettier`

## app 命令

### apps/abi

- 开发：`pnpm --filter chatbi dev`
- 构建：`pnpm --filter chatbi build`
- 测试环境构建：`pnpm --filter chatbi build:test`
- 类型检查：`pnpm --filter chatbi typecheck`
- Lint：`pnpm --filter chatbi lint`
- 路由：启动 ABI 后由 Elegant Router 插件根据 `src/pages` 自动生成；日常开发不手工执行 `gen-route`，也不维护生成文件。

### apps/chat

- 开发：`pnpm --filter ai-bot dev`
- 构建：`pnpm --filter ai-bot build`
- Lint：`pnpm --filter ai-bot lint`
- Preview：`pnpm --filter ai-bot preview`

### apps/dashboard

- 开发：`pnpm --filter abi-dashboard dev`
- 构建：`pnpm --filter abi-dashboard build`
- Lint：`pnpm --filter abi-dashboard lint`
- TS watch：`pnpm --filter abi-dashboard check`

## 默认端口

- ABI：`apps/abi/vite.config.ts` server port `9527`。
- Chat：`apps/chat/vite.config.ts` server port `5173`。
- Dashboard：`apps/dashboard` 开发端口需看其 vite dev config；当前主 `vite.config.ts` 委托 `vite.dev.config.ts`。

## 构建输出

- app 输出通常为各自 `dist`。
- package father build 输出 `dist`。

## 注意事项

1. 根 `pnpm build` 只构建 `apps/*`，不等价于 `build:packages`。
2. `apps/abi` Vite 配置包含内网 proxy，开发环境可能依赖内网服务。
3. `apps/chat` 开发代理同样包含内网地址。
4. dashboard 可能单独部署，构建与 nginx 配置位于 `apps/dashboard`。

## 初始化验证记录

2026-06-26 已执行：

- `pnpm test`：通过，2 个测试文件、9 个用例。
- `pnpm build`：通过，`chatbi`、`ai-bot`、`abi-dashboard` 3 个 app 构建成功。
- `pnpm lint`：失败，根脚本 `eslint . --ext .js,.jsx,.ts,.tsx` 与当前 ESLint flat config 不兼容，`--ext` 不再可用。
- `pnpm type-check`：失败，根目录未发现 `tsconfig.json`，`tsc --noEmit` 打印帮助并返回 1。

构建 warning 包括：Ant Design/TanStack Router `"use client"` 指令被 Rollup 忽略、动态/静态重复 import 无法拆 chunk、dashboard 多处 `eval` 警告、chunk size 超过 500 kB、ABI UnoCSS 图标 `selector-popover`/`selector-trigger` 加载失败。
