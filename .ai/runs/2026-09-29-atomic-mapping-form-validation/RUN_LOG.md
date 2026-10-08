# 原子指标映射字段与表单校验修正

## 范围与阶段

- 日期：2026-09-29。
- 需求：`CURRENT_REQUIREMENT.md` 顶部同名章节。
- 按分析、开发、测试、回归、审查、知识更新阶段在本会话执行，未启动子代理。
- 开始时工作区干净，基线为 `5e7a0fe0`。本轮未改路由、鉴权、大屏或数据源。

## 最终行为

1. 一键映射表格每行新增“指标名称”“数据类型”。名称初值取来源字段的展示名称，可独立编辑；数据类型使用编辑页原有的数值、金额、百分比、文本选项，不猜测来源数据库类型到指标类型的映射。
2. 指标名称与编辑页共用 `validateKnowledgeIndicatorName`：必填、1–50 字符、禁止纯数字、支持中文/英文/数字/下划线、禁止 `_#_`，并等待现有重名检查接口成功。编辑页的映射前缀恢复及名称不变时免查规则保留。
3. 数据类型必填。保存仅校验、提交已选且未映射行；同批指标名称重复时阻断。切换数据语义会清空新配置，成功加载新字段后初始化名称。已映射行不创建新的指标配置字段。
4. 每个映射对象新增顶层 `bizName`、`dataType`；来源字段仍在 `techId` 数组中，来源名称的 `_#_` / `.` 格式、字段类型、别名、聚合方式、兼容字段和对象数组报文不变。
5. 仅原子指标编辑的“业务口径”取消必填和必填星号；填写内容后保留长度和业务描述校验。新建原子指标、派生和复合指标的原有必填不变。
6. 标签语义新增/编辑通过已有 `TableSemantics.label` 改为“数据语义”，未改共享组件默认文案。

## 修改范围

- 指标建模 `components/KnowledgeAtomicMappingDrawer.tsx`：表格配置字段、表单校验接线及选中行报文。
- 同目录 `KnowledgeOperateDrawer.tsx`、`knowledgeOperateDrawer.BusinessStep.tsx`：编辑原子指标口径可选。
- 指标建模 `utils/atomicMapping.ts`、`types/metricModeling.types.ts`：指标自身字段与来源字段分离。
- `utils/knowledgeOperateDrawer.validators.ts`：复用名称校验与可选口径边界。
- 标签语义 `module/TagModal.tsx`：局部标题文案。
- 两个新增测试、两个更新测试，以及需求文档、本运行记录。

## 验证

定向命令（仓库根目录）：

```sh
pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeAtomicMappingDrawer.test.tsx apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/atomicMapping.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeOperateDrawer.validators.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/api-response-contract.test.ts
```

- 5 个测试文件、84 项通过。覆盖报文、名称格式和重名校验等待/成功/失败、口径可选边界、表单字段、未选/已映射行过滤、批内重复、校验失败不提交、提交失败不关闭以及既有接口成功门禁。
- 修复前新增报文断言失败，业务口径空值回归失败。测试运行初期发现根 Vitest 不解析 ABI alias、测试相对路径错误，已通过指向真实 helper 的 mock 修正，没有修改项目测试配置或依赖。
- 新增测试文件 ESLint 通过。所有修改的既有 TS/TSX 文件与 HEAD 逐文件 ESLint 对比，无新增 error；`knowledgeOperateDrawer.validators.ts` 的 2 项 `import/order` 为基线已有问题，未为本需求调整无关导入与旧格式。
- 对 11 个修改/新增 TS/TSX 使用 TypeScript `transpileModule` 检查，无语法错误；此检查不是整个应用的语义类型检查。
- `git diff --check` 通过。未执行全仓测试、全量构建或真实后端写入；浏览器视觉和新增字段后端持久化联调未验证。

## 回归与审查

- 一键映射仍使用原 `/indicator/sync/atom` 接口和对象数组，成功响应后才关闭；无来源字段重命名或数据结构替换。
- 原有抽屉宽度、聚合多选、数据语义锁定、字段勾选禁用与横向滚动行为保留。
- 编辑页名称验证的映射前缀、原名免查规则保留；其他指标类型及原子指标新建必填不变。
- 没有新依赖、全局样式或业务接口调用点；重名检查复用原模块且由现有接口契约测试覆盖。

## AI 系统更新

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并添加本记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：无需更新，没有新的架构或开发流程约束。
- `frontend-dev-guidelines` 与 `vercel-react-best-practices` 用于保持现有组件/表单边界、新字段只由表单维护、来源行继续使用函数式状态更新；未引入其他表单框架或重构模块。
