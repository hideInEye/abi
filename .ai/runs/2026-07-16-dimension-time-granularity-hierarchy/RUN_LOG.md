# 2026-07-16 Dimension Time Granularity Hierarchy

## 任务

修改属性建模下维度建模的时间维配置：调整时间粒度枚举、删除独立时间字段/时间格式表单项、将时间格式下沉到关联字段、固定关联字段表格高度、移除时间层级快捷生成并改为拖拽时间粒度生成层级。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/constants/dimensionModeling.constants.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/types/dimensionModeling.types.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/BaseInfoTab.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.tsx`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 实现说明

- 时间粒度枚举更新为 `year`、`half_year`、`quarter`、`month`、`week`、`day`。
- 兼容旧值 `year_quarter`、`year_month`、`year_week`、`year_month_day` 的回显转换。
- 时间维关联字段表格新增 `timeFormat` 列，默认值为 `yyyy-MM-dd`。
- 提交时 `timeFormat` 位于每个关联字段对象中；`typeParams` 仅保留 `timeGranularity`。
- 时间维层级弹窗删除快捷生成区域，不再按关联字段自动推断层级；左侧拖拽源改为当前时间维选择的时间粒度。
- 维度编辑基础信息表单中，“说明信息”标题增加上边距，避免与上方“更新频率”字段贴边。

## 验证

- 已执行静态关键字检查，确认无 `TIME_TEMPLATE`、`selectedTemplates`、`regenerateTimeCards` 残留。
- 已执行静态关键字检查，确认无 `timeField/timeFormat` 独立表单项残留。
- 已执行 `git diff --check`，通过。
- 未运行构建和完整测试；本轮为局部 UI/mapper 调整，按当前任务只做静态验证。

## 风险

- 未通过浏览器手工验证实际拖拽交互；如需可后续启动页面检查。
- 保留了旧 API 字段 `timeField/timeFormat` 的解析兼容逻辑，但不再作为表单字段或顶层提交字段使用。

## AI 文档更新建议

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 暂不需要更新 `.ai/context`、`.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/checklists` 或 `.ai/decisions`。
