# 指标创建/编辑第二步自定义衍生计算逻辑引用分组调整

## 需求类型

限定范围前端 UI 数据展示与交互逻辑调整

## 背景

指标创建/编辑第二步中，当指标类型为“衍生指标”且衍生模板为“自定义类”时，计算逻辑区域右侧“点击引用字段”当前按维度/度量/日期及旧逻辑展示，需要改为按可引用指标类型展示。

## 目标

- 将右侧“点击引用字段”展示分组改为“原子指标”和“派生指标”。
- 数据来源沿用当前第二步已查询/可用的指标列表逻辑。
- 原子指标筛选条件为 `indicatorClass === 'atomic'`。
- 派生指标筛选条件为 `indicatorClass === 'derived'`。
- 点击任意原子指标或派生指标项时，仍插入到左侧计算逻辑编辑器中。
- 保留现有插入交互方式。

## 非目标

- 不再使用维度/度量/日期分类。
- 不修改样式 class。
- 不做视觉调整。
- 不大范围重构指标建模模块。
- 不修改与本次计算逻辑引用分组无关的业务流程。
- 本轮不运行构建/测试，由主线程执行。

## 影响范围预期

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/KnowledgeOperateDrawer`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/TechnicalStep`
- 指标建模中自定义衍生逻辑/计算逻辑相关组件和 utils。
- `.ai/runs/<date>-metric-custom-derived-reference-groups/`

## 验收标准

- 仅在“衍生指标 + 自定义类”计算逻辑区域右侧引用列表中展示“原子指标”和“派生指标”两组。
- 原子指标组只包含 `indicatorClass === 'atomic'` 的指标。
- 派生指标组只包含 `indicatorClass === 'derived'` 的指标。
- 点击两组中的任一指标后，能沿用原插入方式插入到左侧计算逻辑编辑器。
- 不修改样式 class、不引入视觉调整。
- 不回退或覆盖用户已有改动。

## 测试要求

- 本轮按用户要求不运行构建/测试。
- 进行代码级回归检查，确认引用列表数据来源、分组过滤和点击插入逻辑满足需求。
- 运行记录中说明未运行构建/测试的原因。
