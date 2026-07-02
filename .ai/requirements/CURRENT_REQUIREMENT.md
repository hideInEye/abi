# 项目实例版：新增本体知识图谱关系筛选优化

## 需求类型

新功能

## 背景

当前仓库的主业务应用是 `apps/abi`，其中本体知识图谱模块位于 `apps/abi/src/pages/workbench/ontology-kg/`。已有测试覆盖了 `shared-network-types.ts` 和 `kggraph/utils/graph.ts`，说明该模块适合继续用 Vitest 做 characterization/unit tests。

## 目标

在本体知识图谱图谱视图中，为关系筛选逻辑补充“空筛选时保持当前空态、不请求图谱”的行为保护，并准备后续扩展筛选 UI 的测试基础。

## 非目标

- 不重构整个 `ontology-kg` 模块。
- 不修改 `packages/simple-router` 或全局路由。
- 不新增后端接口。
- 不调整 `apps/chat` 或 `apps/dashboard`。

## 用户流程 / 使用场景

用户进入 `apps/abi/src/pages/workbench/ontology-kg/kggraph` 相关页面后，在实体或关系筛选项为空时，页面不应发起无意义图谱请求；有实体或关系筛选项时，才允许请求图谱数据。

## 影响范围预期

- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`
- 可能涉及 `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts`

## 详细需求

- 保持 `shouldRequestGraph(filtersLoaded, entities, relations)` 的现有语义：筛选加载完成且实体/关系至少一个非空时才返回 true。
- 为后续新增筛选 UI 时的 graph data filter 逻辑补充测试样例。
- ID 处理必须遵循 `OntologyNetworkId = string | number`，不得强制转为 number。

## 验收标准

- `pnpm test -- apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts` 通过。
- `pnpm test` 通过。
- 不修改业务无关文件。

## 测试要求

使用 Vitest，测试文件继续放在 `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`。

## UI / 样式要求

本示例不涉及 UI。如果后续涉及 ABI 页面 UI，应遵守 `apps/abi/src/styles/css/global.css`、`apps/abi/uno.config.ts` 和 Ant Design 主题规则。

## 数据 / 接口要求

不新增接口。若后续调用 API，应复用 `apps/abi/src/service/request/index.ts` 中的 `apiRequest` 或对应领域 service。

## 风险和限制

- `ontology-kg` ID 可能超过 JS 安全整数，不能强制转 number。
- 根 `pnpm lint` 当前不可用，原因是 ESLint flat config 不支持根脚本 `--ext` 参数。
- 根 `pnpm type-check` 当前不可用，根目录没有 `tsconfig.json`。

## 备注

这是项目实例版，真实开发前请把下面空白模板版复制到本文件并改成实际需求。

---

# 空白模板版

## 需求类型

新功能 / Bug 修复 / 重构 / 性能优化 / UI 调整 / 测试补充 / 文档更新 / 其他

## 背景

说明为什么要做这个需求。

## 目标

这次必须完成什么。

## 非目标

这次明确不做什么。

## 用户流程 / 使用场景

用户如何使用，或者系统在哪个场景触发。

## 影响范围预期

可能影响哪些模块、页面、接口、数据结构或配置。

## 详细需求

写清楚功能点、规则、边界条件。

## 验收标准

如何判断完成。

## 测试要求

需要新增或更新哪些测试。

## UI / 样式要求

如果涉及 UI，说明视觉、交互、响应式要求。

## 数据 / 接口要求

如果涉及数据或接口，说明字段、协议、兼容性要求。

## 风险和限制

不能破坏什么，不能改什么，不能引入什么。

## 备注

其他补充。
