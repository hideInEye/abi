# 指标编辑页关键字段锁定运行记录

## 结果

- 原子、派生、复合指标编辑时统一锁定业务配置中的指标类型；新增状态不受影响。
- 原子指标编辑时隐藏“技术定义”标题，将语义选择文案改为“数据语义”，并锁定指标编码、数据语义和来源字段。
- 派生指标编辑时锁定指标编码及原子指标选择。
- 复合指标字段文案改为“指标模版”，编辑时锁定指标编码、指标模版及各模板要求锁定的关键参数。
- 复合自定义模板使用“数据语义”文案，并在编辑时锁定数据语义和来源字段入口。
- 计算精度、时间范围、比较周期、滚动窗口、表达式等未被需求指定的字段保持原编辑能力。

## 验证

1. `pnpm --filter chatbi exec vitest run src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.MetricAggregationUi.test.ts`
   - 通过：1 个测试文件，12 个用例。
   - Vitest 完成后输出既有的 Vite 进程关闭超时提示，不影响测试结果。
2. 指标建模本次修改文件执行定向 ESLint `--quiet`。
   - 通过，无 error。
3. `apps/abi/src/components/tableSemantics.tsx` 定向 ESLint。
   - 未通过：该文件已有 7 个存量规则错误，涉及 import 顺序、参数数量、异步返回一致性、禁止 `void` 和嵌套三元表达式；本次仅增加可选标题参数，未扩展处理存量问题。
4. `pnpm --filter chatbi typecheck`
   - 未通过：仓库存在大量既有 TypeScript 基线错误，包含代理配置、路由类型、公共组件、依赖声明等；本次修改路径未在输出中出现新增类型错误。
5. 本次相关文件执行 `git diff --check`。
   - 通过。

## 回归检查

- 新建指标继续使用未锁定控件。
- 简单原子指标编辑仍允许修改聚合方式。
- 占比模板的计算精度、累积模板的时间参数、同环比模板的比较周期、波动模板的滚动窗口保持可编辑。
- 自定义模板表达式保持可编辑，提交字段及接口流程未修改。

## AI 资产评估

- 本次无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
