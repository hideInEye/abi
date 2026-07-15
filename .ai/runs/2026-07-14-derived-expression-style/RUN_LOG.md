# 2026-07-14 派生指标表达式样式调整

## 需求

调整指标建模中派生指标第二步「表达式定义」的展示样式：

- 添加分支后，且/或显示在左侧中间，不使用选择框。
- 且/或节点与分支连接线连上。
- 表达式标题样式对齐设计图。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`

## 实现记录

- 将 `innerLogic` 的可视控件从 `ASelect` 改为隐藏表单字段 + 自定义圆形逻辑节点。
- 逻辑节点点击后在 `AND/OR` 间切换，仍保持提交字段为 `derivedExpressions[].innerLogic`。
- 条件列表增加左侧竖线、横向分支线和居中逻辑节点。
- 表达式标题改为浅灰底标签样式。

## 验证

- 已执行：`git diff --check -- apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`
- 结果：通过。

## 未执行

- 未运行构建、ESLint、单元测试。本次为局部 UI 结构与样式调整，且用户近期多次要求类似样式任务不跑构建测试；本轮仅做静态 diff 检查。

## 风险

- 未做浏览器视觉验证，最终位置可能还需按实际弹窗宽度微调。
- 逻辑节点目前保留点击切换能力，避免失去原先 `AND/OR` 能力。

## 是否需要更新 .ai 长期文档

- 不需要。该变更为单点 UI 需求，不形成稳定开发规则。
