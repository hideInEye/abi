# 一键映射维度 batchCreate 接口联调

## 基本信息

- 日期：2026-08-04
- 任务名称：dimension-batch-create-api
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`；本轮以用户追加接口联调要求为准
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Developer、Test、Regression、Knowledge
- 任务类型：前端接口联调 / 参数映射调整

## 需求摘要

将“一键维度映射”提交逻辑从逐条调用维度创建接口，调整为调用 `/api/v1/ontology/dimension/batchCreate` 批量接口。请求体为数组，一个选中字段对应一个对象，字段包含 `spaceId`、`techId`、`semanticsGroupId`、`groupId`、`relSchemaId`、`relViewId`。

## 影响范围

- `apps/abi/src/service/api/dimension-modeling.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/hooks/useDimensionModeling.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/types/dimensionModeling.types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`

## 修改文件

- 新增 `batchCreateDimensionModels` API 方法，沿用 ABI `apiRequest` 与 ontology dimension API 前缀，实际请求路径为 `/api/abi-ontology/api/v1/ontology/dimension/batchCreate`。
- 新增 `DimensionBatchCreatePayloadItem` 类型。
- 调整 `buildDimensionBatchCreatePayload`，返回批量接口需要的数组参数。
- 调整 `useDimensionModeling` 的一键映射提交逻辑，一次性调用批量接口，不再循环调用 `/create`。
- 更新 mapper 单测，校验 `fieldName` 会作为批量接口对象的 `techId`。

## 实现说明

一键映射抽屉仍负责选择数据语义组、预览字段、过滤已存在字段。提交时只提交当前选中的未禁用字段。每个字段生成一个对象：

```ts
{
  spaceId,
  techId: row.field.fieldName || row.field.techId,
  semanticsGroupId,
  groupId,
  relSchemaId,
  relViewId
}
```

本轮保留此前“字段名使用 `fieldName`”的要求，因此批量接口中的 `techId` 优先取 `fieldName`。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：1 个测试文件、8 个用例通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi build`：通过。

### 失败和修复过程

本轮没有失败命令。

## 回归检查

- 原单个“维度自定义”新增/编辑仍使用 `addDimensionModel` / `editDimensionModel`。
- 一键映射抽屉的字段解析、已存在字段置灰和选择行为未调整。
- 批量映射接口只提交选中的未禁用字段。
- ID 保持 `string | number`，未对 `relSchemaId` / `relViewId` 做强制数字转换。

## Review 结果

改动集中在一键映射提交路径，没有修改抽屉 UI、数据语义加载逻辑或普通维度新增编辑流程。批量接口失败时保留抽屉，方便用户重试。

## 发现的问题

构建仍输出既有警告：

- UnoCSS 无法加载图标 `selector-popover`、`selector-trigger`。
- 部分动态导入模块同时被静态导入，Vite 提示不会拆到独立 chunk。
- 部分构建产物超过 500 kB。

这些警告不属于本轮改动引入。

## 本轮经验

一键映射已经有独立 mapper 测试，接口参数切换适合优先调整 pure mapper，再让 hook 只负责提交结果和刷新列表。

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

联调环境可在浏览器 Network 中确认请求体为数组，并观察后端是否对重复字段返回整体失败或部分失败结果。

## 未解决问题

暂无。
