# RUN LOG: Dimension Hierarchy Object Payload

## Basic Info

- Date: 2026-08-17
- Module: `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling`
- Request: 维度层级配置提交去掉最外层数组，改为直接 JSON 对象传输；兼容后端当前返回的层级 group 数组。

## Context

- `.ai/requirements/CURRENT_REQUIREMENT.md` 与本次即时需求不一致，本次按用户最新明确指令处理。
- 上一版根据误传样例将层级配置保存参数包成数组：`[{ spaceId, dimId, groups }]`。
- 用户确认正确格式应为对象：`{ spaceId, dimId, groups }`。
- 后端当前查询返回 `data` 直接为 group 数组，每个 group 下包含 `levels`。

## Changes

- `buildDimensionHierarchyPayload` 返回值从数组改为单个对象：
  - `null` 表示缺少维度、空间或层级数据。
  - 有效时返回 `{ spaceId, dimId, groups }`。
- `editDimensionHierarchy` API 参数类型从数组调整为普通对象。
- `saveHierarchyConfig` 和弹窗保存校验改为对象结构校验。
- `normalizeHierarchyRows` 增加对后端当前返回结构的兼容：
  - 支持 `data: [{ hierarchyName, hierarchyId, levels }]`。
  - 继续兼容之前的 `{ groups: [...] }` 包装结构和旧扁平结构。
- 层级配置中 `_#_` / `_ # _` 拼接名显示继续保留为字段名展示。

## Validation

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
  - 2 files passed
  - 23 tests passed
- Passed: `git diff --check`
- Passed: `pnpm --filter chatbi build`

## Build Notes

- 构建通过。
- 构建过程中仍有既有提示：
  - UnoCSS 图标 `selector-popover`、`selector-trigger` 加载失败。
  - Vite 动态/静态 import 混用提示。
  - 部分 chunk 超过 500 kB。

## Regression Check

- 未修改维度新增/编辑主表单提交逻辑。
- 未修改层级配置拖拽、排序、删除等交互。
- 未回滚或覆盖其它工作区已有改动。

## Long-term Docs

- 本次属于接口参数纠偏和回显兼容修复，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
