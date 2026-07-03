# 项目实例版：基于当前项目的重构对话模板

```text
请重构 `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts`，目标是整理图谱筛选逻辑，但保持行为完全兼容。

必须读取：
- `.ai/context/ARCHITECTURE.md`
- `.ai/context/DESIGN_PATTERNS.md`
- `.ai/context/TESTING_STRATEGY.md`
- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`

重构目标：
- 保持 `shouldRequestGraph`、`requestGraphWhenAllowed`、`deduplicateEdges`、`filterGraphData` 导出兼容。
- 补齐 `filterGraphData` characterization tests。
- 保持 `OntologyNetworkId = string | number`。

非目标：
- 不修改图谱 UI。
- 不改 API。
- 不移动整个 ontology-kg 目录。

验证：
- 每步运行 `pnpm test -- apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`。
- 最后运行 `pnpm test`。
- 如改动影响 ABI 构建，运行 `pnpm --filter chatbi build`。

完成后更新：
- run log。
- 如果形成新的测试规则，更新 `.ai/context/TESTING_STRATEGY.md`。
```

# 空白模板版：重构对话模板

```text
你是当前项目的重构执行者。请明确重构目标和非目标，保护现有行为，先补 characterization tests，小步重构，每步验证，保持 API/UI/业务行为兼容，输出风险和回滚方案，并更新架构文档和 run log。
```
