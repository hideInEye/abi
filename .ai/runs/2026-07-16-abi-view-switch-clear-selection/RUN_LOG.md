# ABI 列表切换卡片清空选中态

## 时间
- 2026-07-16 12:34:04 CST

## 需求
- ABI 所有存在表格批量选择和卡片/列表切换的页面，切换视图时清空选中数据，避免进入卡片视图后批量删除按钮仍可点击。

## 处理范围
- 更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 记录追加需求。
- `useTableOperate` 增加 `clearCheckedRowKeys`，供复用 hook 的页面切换视图时清空批量选择。
- 为 ABI 内存在 `selectedRowKeys` / `checkedRowKeys` 且使用 `ViewControls` 的页面补充 `handleViewModeChange`。

## 修改文件
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/abi/src/hooks/common/table.ts`
- `apps/abi/src/pages/component/data/data-dictionary/index.tsx`
- `apps/abi/src/pages/component/system/model/modules/model-card-list.tsx`
- `apps/abi/src/pages/component/system/plugin/components/PluginTable.tsx`
- `apps/abi/src/pages/component/system/skills/index.tsx`
- `apps/abi/src/pages/component/system/tools/index.tsx`
- `apps/abi/src/pages/space-list/index.tsx`
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx`
- `apps/abi/src/pages/workbench/data-preparation/data-collection/index.tsx`
- `apps/abi/src/pages/workbench/data-preparation/data-source/index.tsx`
- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/components/semantics-table-list.tsx`
- `apps/abi/src/pages/workbench/job/log/index.tsx`
- `apps/abi/src/pages/workbench/job/time/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/DimensionModeling.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/MetricModeling.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/relation/index.tsx`

## 验证
- `for f in $(rg -l "ViewControls" apps/abi/src -g '*.tsx'); do if rg -q "selectedRowKeys|checkedRowKeys" "$f" && rg -q "onViewModeChange=\\{setViewMode\\}" "$f"; then echo "$f"; fi; done`
  - 结果：无输出，表示存在批量选中态的 ViewControls 页面不再直接使用 `setViewMode`。
- `rg -n "onViewModeChange=\\{setViewMode\\}" apps/abi/src -g '*.tsx'`
  - 结果：仅剩 `SemanticTag.tsx`，该页无批量选中态，不属于本次问题。
- `git diff --check -- <本次修改文件>`
  - 结果：通过，无空白错误。

## 未执行
- 未运行构建、ESLint 或完整测试；本次为前端状态清理改动，执行了静态路径与补丁格式校验。

## 后续维护建议
- 暂不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
