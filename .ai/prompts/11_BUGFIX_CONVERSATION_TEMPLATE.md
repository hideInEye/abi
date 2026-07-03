# 项目实例版：基于当前项目的 Bugfix 对话模板

```text
请修复一个当前项目适用的 bug：`apps/chat` 中多个接口同时 401 时，登录过期处理不能重复触发。

必须读取：
- `.ai/context/ERROR_HANDLING.md`
- `.ai/context/API_CONTRACTS.md`
- `.ai/context/TESTING_STRATEGY.md`
- `apps/chat/src/service/request/index.ts`
- `apps/chat/src/utils/auth.ts`
- `packages/auth/src/index.ts`

复现/定位：
1. 检查 `apps/chat/src/service/request/index.ts` 的 axios response interceptor。
2. 检查 `apps/chat/src/utils/auth.ts` 是否复用 `createAuthManager`。
3. 构造并发调用 `handleLoginExpired()` 的最小测试或手动场景。

修复要求：
- 不新增孤立全局状态；优先复用 `packages/auth/src/index.ts` 的 stateKey 防重机制。
- 保持 host `window.onTokenExpired` 兼容。
- 不改 ABI 登录流程。

测试与验证：
- 优先为 `packages/auth` 或 Chat auth helper 补 Vitest。
- 运行 `pnpm test`。
- 如涉及 Chat 构建，运行 `pnpm --filter ai-bot build`。

收尾：
- 写 run log。
- 判断是否更新 `.ai/context/ERROR_HANDLING.md` 或 `.ai/skills/debug-failure.md`。
```

# 空白模板版：Bugfix 对话模板

```text
你是当前项目的 Bug 修复执行者。请先复现问题，找到最小失败场景，分析根因，添加回归测试，修复代码，验证修复，检查影响范围，生成 run log，并判断是否更新 `.ai/`。
```
