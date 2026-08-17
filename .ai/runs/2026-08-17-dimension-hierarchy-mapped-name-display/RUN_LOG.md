# RUN LOG: Dimension Hierarchy Mapped Name Display

## Basic Info

- Date: 2026-08-17
- Module: `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling`
- Request: 修改维度层级配置中带 `_#_` / `_ # _` 拼接规则名称的显示。

## Context

- `.ai/requirements/CURRENT_REQUIREMENT.md` 与本次即时需求不一致，本次按用户最新明确指令处理。
- 维度一键映射字段中文名会按 `表中文名_#_字段中文名` 规则拼接；层级配置里继续展示完整拼接名会造成字段名过长且不符合编辑回显预期。

## Changes

- 在 `HierarchyModal.tsx` 新增 `getHierarchyBizNameDisplay`：
  - 兼容标准 `_#_` 分隔符。
  - 兼容用户描述里的 `_ # _` 带空格写法。
  - 展示时只取字段名后半段。
- 层级配置左侧可选字段、右侧层级项、历史回显 fallback 均使用拆分后的展示名。
- 保持既有层级参数分组提交逻辑不变。
- 新增 Vitest 回归用例覆盖 `_#_`、`_ # _` 和历史层级回显场景。

## Validation

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
  - 2 files passed
  - 22 tests passed
- Passed: `git diff --check`
- Passed: `pnpm --filter chatbi build`

## Build Notes

- 构建通过。
- 构建过程中仍有既有提示：
  - UnoCSS 图标 `selector-popover`、`selector-trigger` 加载失败。
  - Vite 动态/静态 import 混用提示。
  - 部分 chunk 超过 500 kB。

## Regression Check

- 未修改维度新增/编辑表单主流程。
- 未修改层级拖拽、排序、删除和保存入口交互。
- 未回滚或覆盖其它工作区已有改动。

## Long-term Docs

- 本次属于局部显示兼容修复，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
