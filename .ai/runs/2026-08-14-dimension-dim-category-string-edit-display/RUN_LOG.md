# RUN LOG: Dimension dimCategory String Edit Display

## Basic Info

- Date: 2026-08-14
- Module: `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling`
- Request: 编辑维度时将后端返回的数字型 `dimCategory` 转为字符串，避免回显时展示数字而不是名称。

## Context

- `.ai/requirements/CURRENT_REQUIREMENT.md` 与本次即时需求不一致，本次按用户最新明确指令处理。
- 现有编辑表单依赖字符串值匹配维度归类选项；后端详情返回数字时会导致 Select 无法匹配 label。

## Changes

- 在 `dimensionModeling.mapper.ts` 的 API 映射阶段将 `dimCategory` 统一转成字符串。
- 在 `buildFormValues` 中再次保证编辑表单值为字符串，兜住历史数据或其它入口传入的数字。
- 新增 Vitest 回归用例，覆盖数字型 `dimCategory` 的编辑回显转换。

## Validation

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
- Passed: `git diff --check`
- Passed: `pnpm --filter chatbi build`

## Build Notes

- 构建通过。
- 构建过程中仍有既有提示：
  - UnoCSS 图标 `selector-popover`、`selector-trigger` 加载失败。
  - Vite 动态/静态 import 混用提示。
  - 部分 chunk 超过 500 kB。

## Regression Check

- 未修改接口 payload 组装逻辑。
- 未修改维度归类选项来源。
- 未回滚或覆盖其它工作区已有改动。

## Long-term Docs

- 本次属于局部回显类型兼容修复，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
