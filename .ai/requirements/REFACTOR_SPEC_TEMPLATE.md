# 项目实例版：重构 ABI ontology graph 工具函数

## 重构名称

抽离本体图谱筛选和边去重工具。

## 背景

`apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts` 已有 `shouldRequestGraph`、`requestGraphWhenAllowed`、`deduplicateEdges`、`filterGraphData`，并已有 Vitest 覆盖部分行为。该模块适合小步重构。

## 重构目标

- 保持现有外部函数签名兼容。
- 将筛选、请求门禁、边去重逻辑保持为 pure functions。
- 补齐 `filterGraphData` 的测试。

## 非目标

- 不改图谱 UI。
- 不改 API。
- 不改 `shared-network-types.ts` 的 ID 类型。

## 当前行为

- `shouldRequestGraph(false, [...], [...])` 返回 false。
- `shouldRequestGraph(true, [], [])` 返回 false。
- 任一筛选项非空时返回 true。
- `deduplicateEdges` 按 `String(edge.id)` 去重。

## 必须保持兼容的契约

- 函数名和导出不变。
- ID 兼容 `string | number`。
- 测试文件仍位于同目录 `graph.test.ts`。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`

## 分步计划

1. 先为 `filterGraphData` 添加 characterization tests。
2. 再做内部命名或拆分。
3. 每一步运行相关测试。

## Characterization Tests

覆盖实体过滤、关系过滤、不可见端点边过滤、string/number ID 混用。

## 验收标准

- `pnpm test -- apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts` 通过。
- `pnpm test` 通过。
- 无业务行为变化。

## 回滚方案

回滚 `graph.ts` 和 `graph.test.ts` 到重构前版本。

## 风险和限制

不要为重构扩大到 `apps/abi/src/pages/workbench/ontology-kg` 其他页面；如果需要修改 UI，另开需求。

---

# 空白模板版

## 重构名称

## 背景

## 重构目标

## 非目标

## 当前行为

## 必须保持兼容的契约

## 影响范围

## 分步计划

## Characterization Tests

## 验收标准

## 回滚方案

## 风险和限制
