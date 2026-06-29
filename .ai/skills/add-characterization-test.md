# Add Characterization Test

## 当前项目执行示例

示例目标：重构前保护 `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts`。

步骤：

1. 阅读 `graph.ts` 和 `graph.test.ts`。
2. 为当前行为补测试：空筛选不请求、任一筛选非空请求、边按 `String(id)` 去重、`filterGraphData` 只保留可见端点。
3. 运行 `pnpm test -- apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`。
4. 测试通过后再重构。

注意：`OntologyNetworkId` 是 `string | number`，测试必须覆盖混用。

## 空白模板版

写明目标行为、样本输入、当前输出、测试路径、运行命令和后续重构步骤。
