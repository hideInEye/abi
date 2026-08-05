# RUN_LOG

## Task

- 为维度建模新增“一键维度映射”抽屉。
- `+ 新增维度` 主按钮默认进入批量映射抽屉，原“维度自定义”通过下拉菜单保留。
- 批量映射按数据语义组加载全部数据语义，解析维度类字段并批量创建维度。

## Scope

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/**`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeAtomicMappingDrawer.tsx`

## Changes

- 新增 `DimensionBatchMappingDrawer`：
  - 只选择“数据语义组”，不要求选择单个“数据语义”。
  - 选择组后加载组下全部数据语义，展示映射范围和待生成维度预览表。
  - 预览表展示字段名、中文名、来源数据语义、生成维度类型。
  - 默认选中未生成字段，已存在字段置灰不可选。
- 扩展维度新增入口：
  - `+ 新增维度` 改为下拉按钮。
  - 主按钮打开“一键维度映射”。
  - 下拉保留“维度自定义”，沿用原新建维度抽屉。
- 扩展批量映射工具：
  - 从 `modelDetail.dimensions` 和 `modelDetail.identifiers` 解析字段。
  - 不解析 `measures`。
  - 只根据字段 `type === 'datetime'` 判断时间维，其它均为标准维。
  - 复用现有 `buildSubmitPayload` 构建维度 create payload。
- 扩展 hook 提交流程：
  - 对选中行逐条调用现有 `addDimensionModel`。
  - 全部成功后刷新列表并关闭抽屉。
  - 部分失败时提示成功/失败数量，保留抽屉用于重试。
- 文案调整：
  - 维度和原子指标映射中的可见“表语义”提示改为“数据语义”。

## Verification

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/*.test.ts`
  - 1 test file, 7 tests passed.
- Passed: `git diff --check`
- Passed: `pnpm --filter chatbi build`
  - Build warnings observed:
    - UnoCSS failed to load icons `selector-popover` and `selector-trigger`.
    - Vite reported existing dynamic/static import chunk warnings.
    - Some chunks exceed 500 kB.
  - These were warnings only; build exited successfully.

## Regression Check

- 原维度自定义新建和编辑抽屉仍保留，入口迁移到新增按钮下拉项。
- 原维度 create/update/delete/list 接口未新增或改协议。
- 批量映射使用现有维度 create 接口逐条创建，不引入后端批量接口假设。
- 数据语义组和数据语义列表仍使用现有 `tableSemanticsGroupList`、`schemalist`、`queryTableSemanticsDetail`。
- 维度类型判断按本次要求只看字段 `type`，测试已覆盖 `fieldType: datetime` 但 `type: varchar` 仍生成标准维。

## AI System Updates

- 不需要更新 `.ai/prompts/`。
- 不需要更新 `.ai/agents/`。
- 不需要更新 `.ai/skills/`。
- 不需要更新 `.ai/mcp/`。
- 不需要更新 `.ai/context/`。
- 不需要更新 `.ai/checklists/`。
- 不需要更新 `.ai/decisions/`。
