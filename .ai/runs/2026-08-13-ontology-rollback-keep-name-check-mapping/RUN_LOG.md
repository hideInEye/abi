# 本体属性建模回退并保留名称校验与映射拼接 Run Log

## 基本信息

- 日期：2026-08-13
- 任务名称：ontology-rollback-keep-name-check-mapping
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Developer、Test、Regression、Review、Knowledge
- 任务类型：代码回退 / 范围收敛 / 回归验证

## 需求摘要

撤销上次代码提交到工作区，只保留中文名称、指标编码、英文名称查重，以及一键映射维度/指标字段拼接逻辑；清除其余上次引入的 schema tree、多数据语义 id、sourceType 等逻辑。

注意：当前 `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是 chat report 旧需求，和本轮用户指令不匹配。本轮以用户明确指令为准。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/utils/ontologyName.ts`
- `apps/abi/src/service/api/ontology-name.ts`

## 修改文件

- 回退上次提交：执行 `git reset --mixed HEAD^`，保留目标代码内容到工作区。
- 保留维度/指标自定义名称查重：`checkOntologyName`、维度中文名/英文名校验、指标名称/指标编码校验。
- 保留一键映射字段拼接：中文名 `表中文名_#_字段中文名`，英文名 `表英文名.字段英文名`。
- 清除上次额外逻辑：`sourceType`、`semanticSchemaIds`、`relSchemaIds`、schema tree 工具和 `/api/copilot/v1/schema/tree` 接入。

## 实现说明

- 维度新增/编辑恢复为单数据语义选择，不再按数据语义组聚合所有字段。
- 维度批量映射 payload 的 `relSchemaId` 恢复为单值，`techId` 内字段保留拼接后的 `bizName` 和 `techName`。
- 指标一键映射恢复为原 `TableSemantics` 单数据语义选择，只保留度量字段名称拼接。
- 指标列表/编辑继续拆分映射名称用于展示，提交时再恢复拼接值。

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

- 首次 `git restore` 被沙箱阻止写入 `.git/index.lock`，已在用户授权后完成。

## 回归检查

- 属性建模目录下不再残留 `sourceType`、`semanticSchemaIds`、`relSchemaIds`、`querySchemaTree`、`semanticTreeSelection`。
- 维度一键映射仍按 `dimensions + identifiers` 生成预览和 payload。
- 一键映射中文名和英文名仍按指定规则拼接。
- 自定义维度/指标仍保留名称本地校验和 `/api/v1/ontology/checkName` 远端查重。

## Review 结果

本轮改动聚焦于撤销多数据语义树形选择相关逻辑，并保留名称校验与映射拼接。未修改图谱画布、实体属性配置、标签表达式或其他无关模块。

## 发现的问题

- `.ai/requirements/CURRENT_REQUIREMENT.md` 与当前用户任务不一致，需要后续维护当前需求文档，避免 AI 误读。

## 本轮经验

当用户要求撤销“上次提交但保留部分逻辑”时，先将内容收敛到目标状态，再执行 `git reset --mixed HEAD^`，可以让工作区最终只呈现需要保留的改动。

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

建议后续同步更新 `.ai/requirements/CURRENT_REQUIREMENT.md`，但本轮不修改长期规则。

## 后续建议

提交前人工重点检查指标类型 `derived/derivative` 对应的后端字段是否符合最新接口定义。

## 未解决问题

无。
