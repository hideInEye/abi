# Run Log: dimension-edit-fields-and-name-fix

## 基本信息

- 日期：2026-08-13
- 任务名称：dimension-edit-fields-and-name-fix
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（当前文件仍是旧 chat 报告需求，本轮以用户最新消息为实际需求）
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Developer、Test、Regression、Knowledge
- 任务类型：Bug 修复 / 回归测试

## 需求摘要

修复本体网络属性建模维度相关问题：

- 一键映射字段拼接继续使用 `表中文名称_#_字段中文名称` 和 `表英文名称.字段英文名称`，字段来源优先为 `rtableName/bizName` 与 `tableName/techName`。
- 维度编辑时名称需要稳定回显。
- 维度编辑时关联字段需要查询数据语义详情，否则字段弹窗无法选择。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/types/dimensionModeling.types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`

## 修改文件

- `DimensionOperateDrawer.tsx`
- `dimensionModeling.types.ts`
- `dimensionModeling.mapper.ts`
- `dimensionModeling.mapper.test.ts`

## 实现说明

- `mapDimensionFromApi` 增加 `rawZhName/rawEnglishName/name/dimensionName/dimensionCode` 等详情字段兜底，避免详情接口字段形态变化时编辑表单名称为空。
- 维度编辑抽屉在已有 `semanticSchemaId` 且当前 schema 缺少 `modelDetail` 时，主动调用 `queryTableSemanticsDetail` 查询数据语义详情，并合并回 `schemaOptions`，使关联字段弹窗能解析字段列表。
- `buildSchemaFieldOptions` 支持 `modelDetail` 为对象或 JSON 字符串两种形态。
- 保持当前映射分隔符为 `"_#_"`，并保留旧 `"_#"` 数据的拆分兼容。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/utils/ontologyName.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeIndicator.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeOperateDrawer.validators.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeSubmitPayload.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：4 个测试文件通过，31 个用例通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi build`：通过。

### 失败和修复过程

- 无失败。
- 构建仍输出已有 UnoCSS 图标 warning：`selector-popover`、`selector-trigger` 加载失败；仍输出 chunk size warning。本轮未修改相关资源与打包配置。

## 回归检查

- 一键映射名称拼接仍使用 `"_#_"`。
- 一键映射维度 payload 仍优先按 `rtableName + bizName`、`tableName + techName` 拼接。
- 维度编辑表单可从 raw/detail 字段恢复名称显示。
- 维度编辑关联字段在列表 schema 缺少 `modelDetail` 时会补查详情。

## Review 结果

- 改动集中在维度编辑与 mapper，未改动后端接口封装和无关 UI。
- 保留现有 string/number ID 兼容，不新增强制 number 转换。
- 当前工作区仍包含用户前面要求保留的查重/字段拼接相关改动，本轮没有回退这些改动。

## 发现的问题

- `.ai/requirements/CURRENT_REQUIREMENT.md` 与当前本体属性建模任务不匹配，仍为旧 chat 报告需求。

## 本轮经验

- 数据语义列表接口不一定包含 `modelDetail`，编辑态依赖关联字段时需要按 schema id 兜底查询详情。
- `modelDetail` 可能是 JSON 字符串，也可能已经是对象，字段解析工具应同时兼容。

## 是否需要更新 AI 系统

### 需要更新的 context

暂不需要。当前发现属于模块实现细节，已记录在 run log。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

- 后续如继续做本体属性建模，建议先更新 `.ai/requirements/CURRENT_REQUIREMENT.md`，避免需求文件长期与实际开发不一致。

## 未解决问题

- 未做浏览器手工联调；本轮以 mapper 单测、diff 检查和 `chatbi` 构建完成验证。
