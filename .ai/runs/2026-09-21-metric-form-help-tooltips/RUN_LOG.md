# 指标表单说明改为标题悬浮提示

## 基本信息

- 日期：2026-09-21
- 模块：ABI 本体网络 / 属性建模 / 指标建模
- 需求：将指标表单控件下方的辅助说明迁移到标题后的提示图标，并为“是否维度交叉”增加指定说明。

## 实施结果

1. 新增指标建模组件内复用的 `KnowledgeFormItemLabel`，统一在标题后展示可聚焦的问号图标，并通过 Tooltip 展示说明。
2. 指标别名、原子指标聚合逻辑表达式、派生聚合方式、主体维度、日期范围、时段范围和预计算执行时间的原下方说明已迁移到标题提示。
3. 衍生逻辑配置的模板说明同步迁移到区块标题提示；表达式预览、来源摘要、聚合继承状态和预计算摘要保持原位。
4. “是否维度交叉”增加提示：“如需多个维度组合分析指标，请勾选”。
5. 动态日期范围、时段范围、派生聚合方式和衍生模板说明继续使用当前表单状态生成，表单字段及提交逻辑未修改。

## 变更文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.FormItemLabel.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.BusinessStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.AtomicTechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.PrecomputeConfig.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExtendedTemplateParams.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证记录

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`：通过，1 个测试文件、7 个用例全部通过。
- 改动文件 ESLint：本次新增/调整代码无新增 error；其余目标文件退出码 0，保留 4 条已有 warning。
- `ExtendedTemplateParams.tsx` 的 ESLint 仍有 1 条既有 `max-params` error；对 HEAD 同文件执行相同规则可复现，未在本次局部 UI 修改中重构无关函数。
- `git diff --check`（本次需求文件）：通过。
- 未运行全量测试或构建；本次按项目规则执行指标建模小模块定向验证。

## 回归检查

- 全部目标说明均由组件内 Tooltip 展示，不修改全局 Ant Design 样式。
- 日期范围、时段范围、派生聚合方式及衍生模板提示仍随当前选择动态变化。
- 表单字段名、默认值、校验规则、接口请求和保存流程未修改。
- 保留派生指标主体维度布局及仓库中其他未提交改动。

## AI 资产更新结论

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 与本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
