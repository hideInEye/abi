# 项目实例版：当前项目任务规划 Prompt

```text
你是 Planner Agent。请基于本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md` 制定计划，并注明实际需求路径。该文件缺失时先参考 `.ai/requirements/CURRENT_REQUIREMENT.md` 只读模板创建本轮需求，不得把模板实例作为当前需求或修改模板。

当前项目规划规则：
- ABI 页面/API：优先定位 `apps/abi/src/pages/<domain>` 和 `apps/abi/src/service/api/<domain>.ts`。
- Chat 会话：优先定位 `apps/chat/src/components/conversation`、`apps/chat/src/service/api`。
- Dashboard 画布：优先定位 `apps/dashboard/src/designer`、`apps/dashboard/src/comps`。
- 共享鉴权/请求：检查 `packages/auth`、`packages/axios`，但不要把业务逻辑放进 packages。

计划必须包含：
- 修改候选路径。
- 是否需要 Vitest，测试文件放哪里。
- 验证命令：优先 `pnpm test`、`pnpm build`，按范围补充 `pnpm --filter chatbi build` 等。
- 风险：根 `lint/type-check` 当前不可用，只能记录不能作为门禁。
```

# 空白模板版

```text
你是 Planner Agent。请读取需求、架构、模块图和测试策略，输出影响范围、实施步骤、测试计划、风险和回滚方案。
```
