# RUN LOG: Dimension Hierarchy Group Payload

## Basic Info

- Date: 2026-08-14
- Module: `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling`
- Request: 根据接口样例调整维度层级配置提交参数，使用 `spaceId + dimId + groups + levels` 的分组结构；`hierarchyId` 没有值时不传，后端回显后再次保存时带回。

## Context

- `.ai/requirements/CURRENT_REQUIREMENT.md` 与本次即时需求不一致，本次按用户最新明确指令和附件接口样例处理。
- 旧实现将每个层级 level 拍平成数组逐条提交，并对新增层级传 `hierarchyId: null`。
- 新接口样例要求外层数组中每个对象代表一个维度，内部 `groups` 表示多个层级结构，每个 group 内部再放 `levels`。

## Changes

- 新增维度层级提交类型：
  - `DimensionHierarchyEditPayload`
  - `DimensionHierarchyGroupPayload`
  - `DimensionHierarchyLevelPayload`
- 调整 `HierarchyModal` 保存 payload：
  - 输出结构改为 `[{ spaceId, dimId, groups: [{ hierarchyName, hierarchyId?, isDefault, drillDirection, status, levels }] }]`。
  - `hierarchyId` 仅在已有有效值时传递，不再传 `null`。
  - `configJson` 继续保持对象结构，包含 `fieldKey`、`fieldName`、`techId`。
- 调整层级回显兼容：
  - 继续兼容旧的扁平层级列表。
  - 兼容后端返回的 `groups` 包装结构，展开为当前卡片 UI 使用的数据。
  - 后端第二次返回的 `hierarchyId` 会保存到卡片级元信息，再次提交时带回对应 group。
- 新增 `HierarchyModal.test.ts`，覆盖分组提交结构、无 `hierarchyId` 时不传、回显后再次保存保留 `hierarchyId`。

## Validation

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
  - 2 files passed
  - 20 tests passed
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
- 未修改层级配置 UI 的拖拽、排序、标题编辑交互。
- 未回滚或覆盖其它工作区已有改动。

## Long-term Docs

- 本次属于局部接口参数对齐，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
