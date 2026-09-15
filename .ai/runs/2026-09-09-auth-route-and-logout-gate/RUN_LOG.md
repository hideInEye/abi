# 鉴权接口路由迁移与退出登录成功门禁 Run Log

## 基本信息

- 日期：2026-09-09
- 任务名称：auth-route-and-logout-gate
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及角色阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：接口协议迁移 / 鉴权流程缺陷修复

## 需求摘要

将 ABI 中 `/api/auth/xxx` 鉴权接口迁移到 `/api/xxx`，并让 ABI、Chat 的显式退出登录统一先等待 `POST /api/logout` 明确成功，成功后才清理本地登录态和跳转；接口失败（包括 401）时保留当前状态。

## 影响范围

- ABI 鉴权 API、退出编排、两个退出菜单、内置 `/logout` action 和请求错误分流。
- Chat 退出 API、退出编排、用户退出菜单和请求错误分流。
- 对应的 API 路径、退出时序和 401 策略 Vitest 文件。
- 当前需求文档与本 run log。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/abi/src/service/api/auth.ts`
- `apps/abi/src/service/api/platform.ts`
- `apps/abi/src/service/logout.ts`
- `apps/abi/src/service/logout.test.ts`
- `apps/abi/src/service/api/auth.test.ts`
- `apps/abi/src/service/request/auth-policy.ts`
- `apps/abi/src/service/request/auth-policy.test.ts`
- `apps/abi/src/service/request/error.ts`
- `apps/abi/src/utils/auth.ts`
- `apps/abi/src/layouts/modules/global-header/components/UserAvatar.tsx`
- `apps/abi/src/layouts/modules/global-sider/index.tsx`
- `apps/abi/src/router/routes/builtin.ts`
- `apps/chat/src/service/api/auth.ts`
- `apps/chat/src/service/api/auth.test.ts`
- `apps/chat/src/service/logout.ts`
- `apps/chat/src/service/logout.test.ts`
- `apps/chat/src/service/request/auth-policy.ts`
- `apps/chat/src/service/request/auth-policy.test.ts`
- `apps/chat/src/service/request/index.ts`
- `apps/chat/src/components/layout/UserProfileCard.tsx`

## 实现说明

1. 验证码、登录和自定义认证错误路径分别改为 `/api/captchaImage`、`/api/login`、`/api/error`；新增 `POST /api/logout`。
2. ABI 新增 app-local 退出编排：`requestLogout` 对 flat request 做显式成功断言，`logoutNow` 仅在断言通过后调用本地清理和跳转。两个菜单返回该 Promise，内置 `/logout` action 也先等待接口再 reset store。
3. Chat 新增 app-local 退出编排并显式识别 `200`、`0000`、`success: true` 或 `data: true`；失败或异常均不调用共享 auth manager 的本地退出。
4. ABI 与 Chat 请求层均将 `/api/logout` 从自动 401 登录过期流程中排除，避免退出接口失败时绕过成功门禁清理 token；其他接口的 401 行为保持不变。
5. 业务接口地址保留在各 app，不写入 `packages/auth`；所有请求继续使用现有 request 封装并自动携带 Authorization。

## 测试记录

### 新增但未执行的测试

- ABI 鉴权 API 路径测试。
- ABI 退出接口等待、成功继续、失败/异常阻断测试。
- ABI 退出 401 与普通 401 分流策略测试。
- Chat 退出 API 路径、响应成功判定、成功/失败/异常时序测试。
- Chat 退出 401 与普通 401 分流策略测试。

### 执行的命令

- 未执行 Vitest、typecheck 或 build 命令；仅进行了源码路径与调用顺序检查。

### 未执行原因

用户明确要求本轮不进行构建测试，只完成代码修改并记录本次改动。后续建议按需求文件中的命令清单补跑验证。

## 回归检查

已完成代码级检查：

- ABI 两个可见退出入口均返回 `logoutNow()` 的 Promise。
- ABI 内置 `/logout` action 在 `resetStore()` 前等待 `requestLogout()`。
- Chat 用户退出入口返回 `logoutNow()` 的 Promise。
- ABI/Chat 的本地清理或 auth manager 调用均位于退出接口成功判定之后。
- `/api/logout` 失败不会触发退出专属成功链路；普通接口 401 仍进入原登录过期流程。
- 业务源码中的旧 `/api/auth/xxx` 请求路径已移除。

## Review 结果

- 改动限制在鉴权 API、退出流程及其测试，没有修改登录参数、后端成功码约定、页面视觉或无关业务模块。
- 未把业务接口路径下沉到共享包，保持 app/package 边界。
- 未恢复或覆盖任务开始前的用户改动；任务开始时工作树为空。

## 风险与未解决事项

- 未执行自动化测试、类型检查和构建，因此编译与运行结果未验证。
- 未连接真实后端验证 `/api/logout` 的响应体；Chat 成功判断按项目现有 `200`、`0000`、布尔成功字段约定实现。
- 需后续手工验证退出接口成功、业务失败、网络失败和 401 四种场景下的确认弹窗、token 和页面跳转行为。

## 是否需要更新 AI 系统

- `context/`：不需要；未改变稳定架构或通用接口约定。
- `prompts/`：不需要。
- `agents/`：不需要。
- `skills/`：不需要。
- `mcp/`：不需要。
- `checklists/`：不需要。
- `decisions/`：不需要；本次为局部协议迁移，不构成架构决策。
- `requirements/`：已更新当前需求状态与用户追加的“不执行测试/构建”约束。

## 后续验证建议

- 运行新增定向 Vitest。
- 运行 ABI 与 Chat 类型检查和构建。
- 联调真实 `/api/logout` 并完成成功、业务失败、网络失败、401 的手工回归。
