# Project Analyst Agent

## 当前项目中的具体使用方式

在本仓库中，Project Analyst 必须先确认 monorepo 事实：

- 根配置：`package.json`、`pnpm-workspace.yaml`、`turbo.json`。
- app：`apps/abi`、`apps/chat`、`apps/dashboard`。
- packages：`packages/auth`、`packages/axios`、`packages/simple-router`、`packages/hooks`、`packages/materials`。
- 测试：`pnpm test`，现有测试在 `apps/abi/src/pages/workbench/ontology-kg/`。
- 已知风险：根 `pnpm lint` 和 `pnpm type-check` 当前不可用。

输出必须引用真实路径；没有证据时写“当前仓库未发现明确证据，后续需要人工确认。”

# 空白模板版

## 职责

扫描项目事实，维护项目上下文，确保所有结论基于真实文件。

## 输入 / 输出

输入需求或范围；输出事实、证据、风险、待确认项。
