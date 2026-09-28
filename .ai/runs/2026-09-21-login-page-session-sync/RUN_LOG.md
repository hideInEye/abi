# 登录页同步其他标签页登录状态

## 结果

- 登录成功后写入完成标记，其他停留在登录页的标签页通过 `storage` 事件识别完整的新会话。
- 登录页首次进入时检查已有会话；重新获得焦点或恢复可见时，仅在完成标记变化后补查，避免在 token 早于用户信息写入时提前跳转。
- 有效会话会先同步当前标签页 Redux 鉴权状态，再初始化授权路由；只有路由初始化成功后才恢复安全有效的 `redirect` 目标，否则沿用既有逻辑返回首页。
- token 缺失、JWT 过期、用户身份信息不完整或菜单初始化失败时保持在登录页。
- 同一轮重复事件通过小模块状态锁去重；失败后允许下一次事件重试。

## 变更范围

- `apps/abi/src/pages/login/index.tsx`
- `apps/abi/src/pages/login/loginSessionSync.ts`
- `apps/abi/src/pages/login/loginSessionSync.test.ts`
- `apps/abi/src/hooks/common/login.ts`
- `apps/abi/src/store/slice/auth/index.ts`
- `apps/abi/src/types/storage.d.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证

- `pnpm exec vitest run apps/abi/src/pages/login/loginSecurity.test.ts apps/abi/src/pages/login/loginSessionSync.test.ts apps/abi/src/router/guard/jwt.test.ts`
  - 通过：3 个测试文件，9 个测试。
- 登录页、登录同步小模块及其测试执行 ESLint `--quiet` 通过。
- `login.ts`、`storage.d.ts` 与 `store/slice/auth/index.ts` 的定向 ESLint 仍报告各文件既有规则错误；使用 HEAD 内容通过 stdin 复核后，错误数量和规则一致，本次未新增该类错误，也未顺带格式化旧代码。
- `pnpm --filter chatbi typecheck`
  - 未通过：仓库现有类型错误较多，涉及代理配置、元数据图、菜单类型、路由生成、工作区依赖等；输出中未出现本次修改文件的新增错误。
- `git diff --check` 通过；新增文件未发现行尾空白。
- 未连接可用联调环境，未执行双标签页手工登录验证。

## 回归检查

- 原登录表单、验证码和显式登录后的欢迎提示未改。
- 既有登录重定向安全校验继续由 `redirectFromLogin` 负责，无效目标和无权限目标仍回首页。
- 登录页不会在过期 JWT、缺少 token 或用户信息尚未完整时请求授权菜单。
- 未修改请求层、菜单接口协议和其他业务模块。

## AI 资产检查

- 本次无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
