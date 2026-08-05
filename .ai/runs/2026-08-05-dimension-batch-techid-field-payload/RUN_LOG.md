# 一键映射维度 techId 字段参数调整

## 基本信息

- 日期：2026-08-05
- 任务名称：dimension-batch-techid-field-payload
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`；本轮以用户追加的接口参数要求为准
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Developer、Test、Regression、Knowledge
- 任务类型：前端接口参数映射调整 / 回归修复

## 需求摘要

一键映射维度调用 `/api/v1/ontology/dimension/batchCreate` 时，数组中每个对象的 `techId` 不再传单个字段字符串，而是传当前选中字段的参数数组。示例结构为：

```json
[
  {
    "groupId": "2080501906844684314",
    "relSchemaId": 390,
    "relViewId": "1277996668473708544",
    "semanticsGroupId": "2080501906844684306",
    "spaceId": 160,
    "techId": [
      {
        "bizName": "城市",
        "fieldType": "categorical",
        "key": "10202611211000",
        "originName": "city",
        "sourceId": "1272272164820750336",
        "sourceTableName": "t_user",
        "techId": "10202611211000"
      }
    ]
  }
]
```

## 影响范围

- `apps/abi/src/service/api/dimension-modeling.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/types/dimensionModeling.types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`

## 修改内容

- 调整批量创建接口类型：`BatchCreateDimensionModelParams.techId` 从字符串改为字段对象数组。
- 调整 `DimensionBatchCreatePayloadItem.techId` 类型，与接口请求体保持一致。
- 新增 `buildDimensionFieldPayload`，集中生成 `techId` 数组中的字段对象。
- 一键映射行解析时保留字段来源信息，确保 `bizName`、`fieldType`、`key`、`originName`、`sourceId`、`sourceTableName`、`techId` 可以进入 batchCreate 请求。
- 将批量 payload 的 `techId` 从 `row.field.fieldName || row.field.techId` 改为 `[buildDimensionFieldPayload(row.field)]`。
- `groupId` 类型扩展为 `number | string`，避免大整数 ID 被强制转数字。
- 更新单测，覆盖示例中的字段对象请求体。

## 回归检查

- 本轮没有修改 `DimensionOperateDrawer`、字段选择弹窗、维度编辑回显逻辑。
- 普通维度新增/编辑仍走原来的单个维度表单 payload。
- 一键映射抽屉仍只提交未禁用字段。
- 批量创建 payload 只在 batchCreate 提交路径变化，不影响关联字段选择的 key 归一化逻辑。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：1 个测试文件、12 个用例通过。
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
