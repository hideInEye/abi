# 派生指标主体维度复选框与统计口径布局调整

## 基本信息

- 日期：2026-09-21
- 模块：ABI 本体网络 / 属性建模 / 指标建模 / 派生指标第二步
- 需求：主体维度下拉增加复选框；主体维度与是否维度交叉同一行显示，并放在时段范围之前。

## 实施结果

1. 主体维度 `TreeSelect` 开启 `treeCheckable`，保留搜索、多选、响应式标签、维度名称映射和原有数组字段。
2. 新增组件内局部网格样式，使主体维度选择器与是否维度交叉在同一独立行展示；窄宽度下自动纵向排列。
3. 统计口径排列调整为：日期范围与派生聚合方式、主体维度与是否维度交叉、时段范围。
4. 增加 UI 源码契约断言，覆盖复选框属性、独立行布局及主体维度位于时段范围之前。

## 变更文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.module.scss`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证记录

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`：通过，1 个测试文件、6 个用例全部通过。
- 改动 TS/TSX 文件 ESLint：退出码 0；保留 3 条本次改动前已存在的格式/属性顺序 warning，无新增 error。
- `git diff --check`（本次需求文件）：通过。
- `pnpm --filter chatbi typecheck`：未获得全量通过；被仓库既有的代理配置、通用组件、路由、依赖声明等大量无关 TypeScript 错误阻塞，输出中未发现本次改动文件报错。
- 未运行全量构建；本次为指标建模组件局部交互与布局调整，已按项目规则执行修改范围内的定向测试和静态检查。

## 回归检查

- 表单字段仍为 `statisticalCaliber.subjectDimensionIds` 和 `statisticalCaliber.isCrossDim`。
- 主体维度的必填校验、加载失败重试、名称映射与预览/提交数据链路未改动。
- 日期范围、派生聚合方式和时段范围业务逻辑未改动。
- 样式仅位于派生指标组件 CSS Module，不影响全局 Ant Design 组件。

## AI 资产更新结论

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 与本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
