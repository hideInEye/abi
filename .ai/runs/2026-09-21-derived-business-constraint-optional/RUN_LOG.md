# 派生指标业务限定表达式改为非必填

## 基本信息

- 日期：2026-09-21
- 模块：ABI 本体网络 / 属性建模 / 指标建模 / 普通派生指标第二步
- 需求：业务限定表达式允许不配置，已配置时继续执行完整性校验。

## 实施结果

1. 规则表达式组件增加默认关闭的 `optional` 模式；仅普通派生指标业务限定表达式启用。
2. 可选模式下没有任何条件时，组件内部不展示分层或分组必填错误。
3. 派生指标表单校验在没有任何条件时直接通过；添加条件后继续执行原有分层、分组、字段、操作符、值和统一逻辑校验。
4. 标签语义及其他规则表达式调用点未启用可选模式，既有必填行为不变。
5. 表单字段、预览、提交协议与接口调用未修改；空表达式继续由既有提交适配逻辑过滤。

## 变更文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/rule-expression/RuleExpressionBuilder.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证记录

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`：通过，1 个测试文件、8 个用例全部通过。
- 改动文件 ESLint：退出码 0，无 error；3 条 warning 均可在 HEAD 基线对应文件中复现。
- `git diff --check`（本次需求文件）：通过。
- 未运行全量测试或构建；按项目规则仅执行指标建模小模块定向验证。

## 回归检查

- 默认空分层、空条件分组或没有任何条件时均按“未配置”处理，可通过校验。
- 新增任意条件后，半填写内容仍被原有校验拦截并定位错误。
- 完整业务限定表达式的预览、关联字段收集和提交转换逻辑未修改。
- 共享表达式组件的可选行为需显式传入 `optional`，不会影响标签语义。
- 保留仓库中指标提示、主体维度布局和语义名单等已有未提交改动。

## AI 资产更新结论

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 与本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
