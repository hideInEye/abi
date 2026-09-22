# 指标建模“衍生”文案统一改为“复合”

## 结果

- 指标类型选择、筛选与列表展示中的“衍生指标”统一改为“复合指标”。
- 指标自定义入口、复合模板字段、占位符、必填提示、逻辑配置标题、生成结果标题、快捷模板按钮和自定义表达式说明中的“衍生”均改为“复合”。
- `derivative` 枚举值、代码标识、组件和文件命名、表单字段、接口参数及业务判断均未修改。
- 扫描 `apps/` 与 `packages/` 后，运行时代码与测试中不再存在“衍生”文字。

## 变更范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/MetricModeling.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/constants/metricModeling.constants.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExpressionEditor.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExtendedTemplateParams.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.TechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`
  - 通过：1 个测试文件，9 个测试。
- 对 6 个改动 TS/TSX 文件执行 ESLint `--quiet`：
  - constants、TechnicalStep 和测试文件通过。
  - MetricModeling、ExpressionEditor、ExtendedTemplateParams 仍报告共 4 个既有规则错误；使用 HEAD 内容通过 stdin 对比后，错误规则和数量完全一致，本次未新增 ESLint 错误，也未顺带修改旧代码。
- `rg "衍生" apps packages` 无匹配。
- `git diff --check` 通过。

## 回归检查

- “派生指标”及“派生聚合方式”等另一指标类型文案保持不变。
- 所有 `value: 'derivative'` 与 `derivative` 映射键保持不变。
- 未修改接口、表单协议、校验逻辑、组件结构或样式。

## AI 资产检查

- 本次无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
