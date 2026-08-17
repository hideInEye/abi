# ABI 登录失效跳转恢复 Run Log

## 基本信息

- 日期：2026-08-10
- 任务名称：abi-auth-redirect-recovery
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：鉴权缺陷修复

## 需求摘要

修复 ABI 首次收到 401 并提示登录失效后，偶发没有进入登录页且后续 401 永久被去重状态拦截的问题。保持同批并发 401 只提示和处理一次。

## 原因定位

- ABI 在共享 `authManager` 外又维护了一份 `flowState.handling`，两份状态可能失去同步。
- 登录失效使用动态导入后的 `router.push()`，而 `@sa/simple-router` 的 `push()` 会立即返回成功，不校验 React Router 是否真正完成导航。分支切换或热更新后，如果调用的是未挂载/旧状态的路由实例，鉴权逻辑仍会把流程视为已进入跳转状态。
- 跳转失败时共享鉴权没有释放 `handling/redirecting`，后续 401 因此持续返回 `false`。

## 修改文件

- `packages/auth/src/index.ts`
- `packages/auth/src/index.test.ts`
- `apps/abi/src/utils/auth.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 实现说明

- 共享鉴权在 `redirectToLogin` 抛错时释放处理中和跳转中状态，让后续 401 可以重试。
- 延迟跳转 Promise 增加 rejection 消费，避免定时器产生未处理异常；状态释放仍在 `runRedirect` 内完成。
- ABI 删除重复的登录失效 flow state，统一由 `authManager` 去重。
- ABI 登录失效改用 `window.location.assign('/login?...')`，绕过可能失效的 SPA 路由实例，并继续复用原有安全 redirect 过滤。
- 未修改 `apps/abi/src/router`。

## 测试记录

### 已通过

- `pnpm exec vitest run packages/auth/src/index.test.ts`：2 个用例通过。
- `pnpm exec tsc --noEmit --skipLibCheck --target ES2020 --module ESNext --moduleResolution Bundler packages/auth/src/index.ts`：通过。
- `pnpm --filter chatbi build`：通过；存在原有 UnoCSS 图标和 chunk size 警告。
- `git diff --check -- packages/auth/src/index.ts packages/auth/src/index.test.ts apps/abi/src/utils/auth.ts .ai/requirements/CURRENT_REQUIREMENT.md`：通过。

### 被既有问题阻断

- `pnpm --filter @sa/auth exec tsc --noEmit -p tsconfig.json`：失败，当前 tsconfig 的 moduleResolution 无法解析 `rollup/parseAst`。
- `pnpm --filter chatbi typecheck`：失败，仓库存在大量既有类型错误和 Vite 5/6 类型冲突；输出未发现由本次逻辑新增的定向类型错误。
- `pnpm test`：本次及其余 134 个用例通过，但 `apps/chat/src/service/api/app.test.ts` 因 `@/constant/chat` alias 无法解析导致全量命令退出 1。
- `pnpm exec prettier --check ...`：三个既有文件风格不符合根 Prettier 配置；为避免整文件无关格式化，本轮以 `git diff --check` 作为改动格式检查。

### 执行过程说明

首次将全量测试与 ABI 构建并行执行时，构建正在替换 `apps/abi/dist/assets`，coverage 扫描因此出现一次 ENOENT。随后先完成 ABI 构建，再单独重跑全量测试，最终只剩上述 chat alias 既有失败。

## 回归检查

- 并发调用 `handleUnauthorized()` 时只有第一次返回 `true`，提示和跳转各执行一次。
- 跳转回调失败后状态会释放，下一次 401 可以重新提示和跳转。
- ABI 仍保留当前路径 redirect、安全同源校验和登录/异常页拦截规则。
- Chat、Dashboard 继续使用各自 stateKey 和应用级跳转回调，共享包只新增失败恢复，不改变成功去重流程。
- `apps/abi/src/router` 无改动。

## Review 结果

- 未发现业务路由写入共享包、跨应用依赖或重复 401 提示回归。
- 浏览器级导航会完整刷新 ABI，这是登录态清理后的预期行为，也能清除分支切换/HMR 遗留的内存路由和 Redux 状态。
- 未能在本地模拟后端账号互踢，只通过鉴权管理器回归测试和构建验证该故障路径。

## 是否需要更新 AI 系统

- `.ai/context/`：不需要；鉴权模块边界和 401 入口已有记录，未形成新架构规则。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：不需要。
- `.ai/requirements/`：已补充本次目标、非目标和验收标准。

## 未解决问题

- 根全量测试仍受 chat alias 配置问题阻断。
- ABI typecheck 仍受仓库存量类型错误和依赖版本类型冲突阻断。
