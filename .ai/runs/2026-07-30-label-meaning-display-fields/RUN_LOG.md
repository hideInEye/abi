# RUN_LOG

## Task

- 修改指标列表和卡片展示的“指标名称”字段为 `bizName`。
- 修改维度列表的“维度路径(目录)”字段为接口返回的 `levelPath`。

## Scope

- 指标建模列表列配置、表格列、卡片标题展示。
- 维度建模列表列配置、表格列、列表模型字段透传。
- 不修改接口请求参数、表单提交逻辑和其他业务模块。

## Changes

- `MetricModeling` 的“指标名称”列显隐 key 从 `techName` 改为 `bizName`。
- `KnowledgeTable` 的“指标名称”表格列从 `techName` 改为 `bizName`，卡片标题同步改为 `bizName`。
- `DimensionModeling` 的“维度路径(目录)”列显隐 key 从 `path` 改为 `levelPath`。
- `DimensionTable` 的“维度路径(目录)”表格列从 `path` 改为 `levelPath`。
- `DimensionModelItem` 增加可选 `levelPath` 字段。
- `mapDimensionFromApi` 直接透传接口 `levelPath`，不使用前端推导值覆盖。
- 补充 `dimensionModeling.mapper.test.ts` 用例，验证 `levelPath` 透传。
- 补充 `knowledgeIndicator.mapper.ts`，将指标列表接口返回的 `bizName` / `biz_name` 等同语义字段归一到 `bizName`，避免表格和卡片读不到值。
- `useKnowledgeExtraction` 在列表数据进入表格前应用指标列表归一逻辑。
- 补充 `knowledgeIndicator.mapper.test.ts` 用例，验证指标列表 `bizName` 展示字段归一。
- 指标列表搜索参数从 `techName` 改为 `bizName`，搜索框状态、查询参数类型和 `/indicator/list` 请求体保持一致。
- 补充 `buildKnowledgeIndicatorListQuery`，集中构造指标列表请求参数并测试不再发送 `techName`。

## Verification

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeIndicator.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
- Passed: `git diff --check`
- Passed: 旧展示绑定搜索未发现残留：
  - 指标名称列/卡片不再绑定 `techName`
  - 维度路径列不再绑定 `path`
- Passed: 指标名称搜索链路残留扫描未发现 `searchParams.techName` / `queryParams.techName` / `onSearchChange({ techName })`。
- Passed: `pnpm --filter chatbi typecheck 2>&1 | rg "KnowledgeSearchBar|useKnowledgeExtraction|knowledgeIndicator\\.mapper|metricModeling\\.types"` 未发现本次新增/修改指标搜索链路相关类型报错。
- Blocked by existing repository issues: `pnpm --filter chatbi typecheck`
  - 当前失败点包含既有构建配置、公共组件、旧测试、依赖类型解析等多处类型问题。
  - 本次未扩展修复这些历史问题，避免超出需求范围。

## Regression Check

- 指标查询/编辑字段未变，仅列表和卡片展示字段改为 `bizName`。
- 指标列表数据入口增加字段归一，解决直接改 `dataIndex/key` 后接口字段命名不一致导致展示为空的问题。
- 指标名称搜索请求参数同步改为 `bizName`，不再用 `techName` 查询指标名称。
- 维度 `path` 字段保留原有 mapper 行为，新增 `levelPath` 仅用于列表展示。
- 维度 `levelPath` 使用接口原值，不做前端路径合成或覆盖。

## AI System Updates

- 不需要更新 `.ai/prompts/`。
- 不需要更新 `.ai/agents/`。
- 不需要更新 `.ai/skills/`。
- 不需要更新 `.ai/mcp/`。
- 不需要更新 `.ai/context/`。
- 不需要更新 `.ai/checklists/`。
- 不需要更新 `.ai/decisions/`。
