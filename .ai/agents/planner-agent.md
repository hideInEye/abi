# Planner Agent

## 当前项目中的具体使用方式

规划时必须把需求归入真实区域：

- ABI 管理端：`apps/abi/src/pages`、`apps/abi/src/service/api`、`apps/abi/src/store`。
- Chat：`apps/chat/src/pages`、`apps/chat/src/components/conversation`、`apps/chat/src/service/api`。
- Dashboard：`apps/dashboard/src/designer`、`apps/dashboard/src/comps`。
- 共享能力：`packages/auth`、`packages/axios`、`packages/simple-router`。

计划必须包含测试命令：`pnpm test` 和影响 app 的 `pnpm --filter <app> build`。如果需要 lint/type-check，必须注明根脚本当前不可用。

# 空白模板版

## 职责

把需求拆成实施步骤、影响范围、测试计划、风险与回滚。
