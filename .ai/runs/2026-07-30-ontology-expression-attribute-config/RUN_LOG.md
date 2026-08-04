# RUN_LOG

## Task

- 指标创建/编辑第二步表达式支持修改表达式名称，字段为 `name`，编辑时回显。
- 实体属性配置弹窗按参考图调整：顶部三卡片、一行式新增绑定表单、分组下拉树选择，显示 `父级/子级/xxx` 路径。
- 维度属性配置的数据区域整体使用表格展示，标题通过表格 `title` API 输出。
- 表达式名称文本输入长度收短。
- 维度卡片模式下“创建人”展示 `createBy`。
- 运行测试和构建。

## Scope

- `apps/abi/src/pages/workbench/ontology-kg/entity/**`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/**`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/**`

## Subagent

- 使用 subagent `Gauss` 处理实体属性配置弹窗相关改造。
- 主 agent review 后集成实体改动，并补充指标表达式、维度 `createBy` 与统一验证。

## Changes

- 指标表达式：
  - `derivedExpressions[].name` 在第二步表达式块头部可编辑。
  - 新增表达式默认名按序生成：`表达式1`、`表达式2`。
  - 编辑回显沿用 `parseKnowledgeCalcLogicFormValues` 中的 `name` 解析。
  - 新建默认表达式补 `name: '表达式1'`。
- 实体属性配置：
  - 顶部实体信息改成三个卡片：当前实体、实体编码、标签类型。
  - 已绑定属性列表提前展示，并加“已绑定属性列表”标题。
  - 新增属性绑定改为底部一行式表单：属性类型、绑定分组、绑定资产、备注、添加按钮。
  - 绑定分组从左侧分组面板改为 `TreeSelect` 下拉树，父级/子级均可选。
  - 下拉选中显示为完整路径，例如 `父级/子级/叶子`。
  - 已绑定属性列表始终由 `Table` 承载，空态、标题和数据展示统一在表格区域内，标题使用 `Table` 的 `title` API。
  - 新增 `useAttributeGroups` 读取分组列表，新增 `attributeGroups` 工具构造路径树。
  - `useAttributeAssets` 的 `groupId` 保留 `OntologyNetworkId`，避免 Long ID 被强转 number。
- 表达式布局：
  - 表达式名称输入框收窄为 320px 可收缩宽度，避免在表达式卡片头部过长。
- 维度卡片：
  - `mapDimensionFromApi` 透传接口 `createBy`，修复卡片模式“创建人”为空。

## Verification

- Passed: `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/entity/utils/attributeGroups.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeSubmitPayload.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
- Passed: `git diff --check`
- Passed: `pnpm --filter chatbi build`
  - Build warnings observed:
    - UnoCSS failed to load icons `selector-popover` and `selector-trigger`.
    - Vite reported existing dynamic/static import chunk warnings.
    - Some chunks exceed 500 kB.
  - These were warnings only; build exited successfully.

## Regression Check

- 指标表达式提交仍由 `buildDerivedExpressions` 生成，已有 `name` 字段继续传给后端。
- 编辑详情回显仍走 `calcLogic.expressions[].name` 解析，测试已覆盖自定义名称。
- 实体属性配置仍调用原资产接口和保存接口，只调整分组选择 UI 和资产加载参数类型。
- 已绑定属性列表改为表格内标题和空态，不改变属性过滤、删除和保存逻辑。
- 分组树工具测试覆盖路径展示和 string Long ID 不丢失。
- 维度 `createBy` 只增加 mapper 透传，不改接口、列表字段和表单逻辑。

## AI System Updates

- 不需要更新 `.ai/prompts/`。
- 不需要更新 `.ai/agents/`。
- 不需要更新 `.ai/skills/`。
- 不需要更新 `.ai/mcp/`。
- 不需要更新 `.ai/context/`。
- 不需要更新 `.ai/checklists/`。
- 不需要更新 `.ai/decisions/`。
