# 2026-07-14 指标自定义创建按钮置灰逻辑调整

## 需求

指标建模中“指标自定义”创建入口的置灰逻辑调整为：列表查询回来的数据大于 0 时可以创建。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/MetricModeling.tsx`

## 实现记录

- 新增 `canCreateCustom`，根据当前列表数据 `tableData.length > 0 || pagination.total > 0` 判断。
- “指标自定义”菜单项使用 `disabled: !canCreateCustom`。
- 保留“原子指标映射”入口的原有分组前置逻辑，不影响原子映射创建。

## 验证

- 已执行：`git diff --check -- apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/MetricModeling.tsx`
- 结果：通过。

## 未执行

- 未运行构建、ESLint、单元测试。本次为单点 UI 禁用逻辑调整，仅做静态 diff 检查。

## 是否需要更新 .ai 长期文档

- 不需要。
