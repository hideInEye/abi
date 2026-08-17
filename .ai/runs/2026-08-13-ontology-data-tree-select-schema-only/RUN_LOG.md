# 本体属性建模数据下拉改树形且仅可选数据语义 Run Log

## 基本信息

- 日期：2026-08-13
- 任务名称：ontology-data-tree-select-schema-only
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Developer、Test、Regression、Review、Knowledge
- 任务类型：前端交互调整 / 回归验证

## 需求摘要

将属性建模中所有数据语义相关下拉改为类似报告模式的数据树结构：数据语义组按父子层级展示，组节点只用于展开和承载层级，不允许被选择；只能选择子级数据语义叶子节点。

注意：当前 `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是旧 chat report 需求，和本轮用户指令不匹配。本轮以用户明确指令为准。

## 影响范围

- `apps/abi/src/components/tableSemantics.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionBatchMappingDrawer.tsx`

通用 `TableSemantics` 会影响属性建模中的维度创建/编辑、指标一键映射、标签创建/编辑等数据语义选择入口。

## 修改文件

- `apps/abi/src/components/tableSemantics.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionBatchMappingDrawer.tsx`

## 实现说明

- 通用 `TableSemantics` 使用 `buildGroupTree` 将数据语义组按 `parentId` 组装为多级树。
- 每个分组节点 `selectable: false`，只允许选择 schema 叶子节点。
- 父分组展开时通过 `onTreeExpand` 补加载该分组直属数据语义，避免父分组同时有子分组和数据语义时叶子不展示。
- 一键维度映射从“选择数据语义组，加载组下全部数据语义”改为“选择单个数据语义叶子，加载该语义字段预览”。
- 后端提交仍保持原字段拆分：选择 schema 后分别维护 `semanticSchemaId` 和 `semanticsGroupId`。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/utils/ontologyName.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeOperateDrawer.utils.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeIndicator.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeSubmitPayload.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：5 个测试文件、30 个用例通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi build`：通过。存在项目既有 UnoCSS 图标加载警告和 chunk size 提示，不影响构建结果。

### 失败和修复过程

- 无。

## 回归检查

- 属性建模相关目录未重新引入 `sourceType`、`semanticSchemaIds`、`relSchemaIds`、`querySchemaTree`、`semanticTreeSelection`。
- 分组节点只设置为不可选；选择回调仍只在 schema 叶子选择时触发。
- 维度/指标名称查重和字段拼接逻辑保持不变。

## Review 结果

本轮只调整数据语义选择交互和一键维度映射的选择粒度，未修改实体属性配置、图谱画布、指标/维度名称校验规则和后端 payload 的名称拼接规则。

## 发现的问题

- `.ai/requirements/CURRENT_REQUIREMENT.md` 仍与当前任务不一致，建议后续在开始本体属性建模任务前同步需求文件。

## 本轮经验

当分组树存在“父分组同时有子分组和数据语义”的场景时，不能只依赖 TreeSelect 的 `loadData`；已有子节点会阻止懒加载触发，需要在 `onTreeExpand` 中补加载当前分组的直属 schema。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

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

如后续希望搜索未展开的数据语义，需要改为一次性加载完整 schema tree 或接入后端树接口；本轮只做展开加载，不改变接口协议。

## 未解决问题

无。
