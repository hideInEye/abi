# 本体网络数据语义树形下拉

## 基本信息

- 日期：2026-08-10
- 任务名称：ontology-data-semantic-tree-select
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md` 当前仍为历史报告模式需求；本轮以用户追加的本体网络下拉框需求为准
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Developer、Test、Regression、Knowledge
- 任务类型：ABI 本体网络 / 数据语义选择 UI 调整

## 需求摘要

将本体网络中成对出现的“数据语义组 / 数据语义”下拉框合并为一个树形下拉框，字段 label 展示为“数据”。用户在树中选择数据语义叶子节点后，前端仍按原字段分别向后端传递数据语义组 ID 和数据语义 ID，其他业务逻辑不变。

## 影响范围

- `apps/abi/src/components/tableSemantics.tsx`

该通用组件当前用于：

- 标签语义新增/编辑。
- 维度自定义新增/编辑。
- 原子指标映射配置。
- 技术术语计算配置。

另补充调整：

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionBatchMappingDrawer.tsx`
  - 维度一键映射的数据选择入口。
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/DimensionModeling.tsx`
  - 一键映射入口说明文案同步为“数据”。
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionOperateDrawer.tsx`
  - 选择关联字段前置提示同步为“请先选择数据”。

## 修改内容

- 将原来的两个表单项：
  - `数据语义组`：`semanticGroupId` / `semanticsGroupId`
  - `数据语义`：`semanticSchemaId`
  合并为一个 `ATreeSelect`。
- 新字段展示名称改为“数据”，表单 `name` 仍使用 `semanticSchemaId`。
- 树父节点展示数据语义组，父节点不可选；叶子节点展示数据语义。
- 选择叶子节点时，继续回填：
  - `semanticSchemaId`
  - `semanticGroupId`
  - `semanticsGroupId`
  - 调用原 `getSchemaId`，继续传 `viewId`。
- 保留 `groupFieldName` 和 `valueAsString` 行为，避免改变各调用方原来的字段类型与后端参数。
- 树节点使用懒加载，展开数据语义组时再加载该组下的数据语义；编辑回显时仍加载当前分组的数据语义。
- 维度一键映射抽屉也改为树形“数据”选择；父节点为数据语义组且保持可选，选择父节点后继续按原逻辑映射该组下全部数据语义字段，子节点仅用于展示该组下数据语义。
- 同步调整维度一键映射入口说明、维度选择关联字段前置提示中的“数据语义组/数据语义”文案。

## 非目标

- 不修改后端接口、请求参数字段名或 payload 结构。
- 不修改关联字段、表达式、字段映射等后续逻辑。

## 回归检查

- `getSchemaOptions` 仍只同步当前选中的数据语义组下的数据语义列表，保证字段解析逻辑不变。
- `getSchemaId` 回调仍收到拆开的 group/schema/view 字段。
- 清空选择时同步清空 `semanticGroupId`、`semanticsGroupId` 和 `semanticSchemaId`。
- 当前工作区已有的 `MetricModeling.tsx`、`SemanticTag.tsx` 文案改动未被回滚或覆盖。

## 测试记录

### 执行命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/entity/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/shared-network-types.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：9 个测试文件、51 个用例通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi build`：通过。

### 构建警告

构建仍输出既有警告：

- UnoCSS 无法加载图标 `selector-popover`、`selector-trigger`。
- 部分模块同时被动态导入和静态导入，Vite 提示不会拆到独立 chunk。
- 部分构建产物超过 500 kB。

这些警告不属于本轮改动引入。

## 是否需要更新 AI 系统

- `.ai/prompts/`：不需要。
- `.ai/agents/`：不需要。
- `.ai/skills/`：不需要。
- `.ai/mcp/`：不需要。
- `.ai/context/`：不需要。
- `.ai/checklists/`：不需要。
- `.ai/decisions/`：不需要。

## 未解决问题

暂无。
