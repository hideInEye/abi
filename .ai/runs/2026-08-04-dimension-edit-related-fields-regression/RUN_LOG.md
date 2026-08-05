# 编辑维度关联字段回显闪退修复

## 基本信息

- 日期：2026-08-04
- 任务名称：dimension-edit-related-fields-regression
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`；本轮以用户反馈回归问题为准
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Developer、Test、Regression、Knowledge
- 任务类型：前端回归修复

## 需求摘要

用户反馈编辑维度时关联字段会先回显，随后一闪消失；随后继续反馈点击“选择字段”时弹窗没有回显已选字段。排查后确认是编辑抽屉在数据语义字段异步加载后执行字段安全校验时，只按单一 `key` 匹配，无法兼容一键映射引入的 `fieldName` 字段标识；弹窗 Checkbox 也只认 option 的 `key`，未把历史选中 alias 归一成 option key。继续根据截图排查后，补充处理“来源表 + 字段名/中文名”的组合匹配，解决同一数据语义下多来源表字段 ID 不一致时的回显问题。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`

## 修改文件

- `DimensionOperateDrawer.tsx`
- `dimensionModeling.mapper.ts`
- `dimensionModeling.mapper.test.ts`

## 实现说明

- 新增 `getDimensionFieldLookupKeys`，统一提取字段的 `key`、`fieldName`、`techId` 别名。
- `getDimensionFieldLookupKeys` 补充 `originName`、`tfieldName`、`techName`、`bizName` 和 `sourceTableName/tableName/tableRemarks/rtableName/tdesc/sourceId` 组合 key。
- 新增 `normalizeDimensionFieldSelectionKeys`，打开选择字段弹窗时把历史已选 alias 归一到当前 option 的真实 `key`，确保 Checkbox 正常回显。
- 新增 `normalizeDimensionSelectedFieldsToOptionKeys`，优先用完整已选字段对象匹配候选字段 option，再回退到旧 selected key。
- 编辑抽屉构造已选字段映射时，同时按 `key / fieldName / techId` 查找，避免字段列表异步加载后因为 key 形态不同导致回显项被清空。
- 选择字段弹窗确认时继续写回 option `key`，并通过别名映射保留原字段详情，避免时间格式等细节丢失。
- 编辑抽屉的 `selectedSchema` 匹配从 `Number(...)` 比较改为 `String(...)` 比较，兼容字符串 ID。
- 一键映射批量接口 payload 的 `techId` 恢复为优先使用 `fieldName`，符合前置需求。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：1 个测试文件、11 个用例通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi build`：通过。

### 失败和修复过程

本轮没有失败命令。

## 回归检查

- 编辑维度时，关联字段回显不再因异步数据语义字段列表 key 不一致而被清空。
- 点击“选择字段”打开弹窗时，已选字段会按 `key / fieldName / techId` alias 归一后正确勾选。
- 针对 `活动名称(t_campaign)` 这类来源表字段，已补充 `来源表 + 中文名/字段名` 组合匹配，避免候选 option key 与历史回显 key 不一致导致未勾选。
- 新增/编辑的字段选择仍使用现有字段列表与表格展示。
- 一键映射批量接口仍提交数组对象，并优先用 `fieldName` 作为接口对象的 `techId`。

## Review 结果

改动集中在维度建模字段匹配与 mapper 工具，不修改普通维度保存接口结构，不修改数据语义加载组件。

## 发现的问题

构建仍输出既有警告：

- UnoCSS 无法加载 `selector-popover`、`selector-trigger` 图标。
- Vite 提示部分动态导入模块同时被静态导入。
- 部分 chunk 大于 500 kB。

这些警告不属于本轮修复引入。

## 本轮经验

一键映射使用 `fieldName` 后，编辑回显不能只依赖旧的 `techId/key` 单一字段，需要用别名集合做兼容匹配。

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

联调时建议重点验证两类数据：历史手工创建维度、通过一键映射批量创建的维度，确认编辑抽屉关联字段都能稳定回显。

## 未解决问题

暂无。
