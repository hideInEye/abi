# 2026-07-15 本体网络实体/关系批量删除

## 目标

- 实体定义列表增加批量删除功能。
- 关系配置列表增加批量删除功能。
- 表格固定左侧第一个业务字段。
- 批量删除按钮样式与属性建模一致。
- 不运行构建测试。

## 修改文件

- `apps/abi/src/service/api/ontology-network.ts`
- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/entity/hooks/useEntityManagement.ts`
- `apps/abi/src/pages/workbench/ontology-kg/entity/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntityTable.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/relation/hooks/useRelationManagement.ts`
- `apps/abi/src/pages/workbench/ontology-kg/relation/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/relation/components/RelationTable.tsx`

## 验证

- 执行 `git diff --check -- <本次修改文件>`，通过。
- 按用户要求未运行构建和测试。

## 风险与说明

- 本体网络模块 ID 类型遵循现有 `OntologyNetworkId = string | number`，批量删除提交选中行 `id` 字符串数组，避免 Long 精度风险。
- 删除失败时沿用请求层错误提示，只有接口成功返回后才提示批量删除成功。

## AI 文档更新判断

- 不需要更新长期 `.ai/context`、`.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/checklists` 或 `.ai/decisions`。
