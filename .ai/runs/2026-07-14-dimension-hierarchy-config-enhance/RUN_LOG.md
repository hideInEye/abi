# 2026-07-14 维度层级配置交互增强

## 需求

维度配置层级结构支持以下能力：

- 层级结构顶部标题可修改。
- 层级之间可上下拖动排序。
- 左侧字段拖到右侧时生成一个层级结构，可添加多个层级结构。
- 层级结构右上角显示删除结构图标 `X`。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.tsx`

## 实现记录

- 新增拖拽 payload 解析，区分左侧字段拖拽和右侧层级拖拽。
- 标准维无历史配置时右侧默认空状态，拖入字段后创建新的层级结构。
- 左侧字段点击时如果当前没有活动结构，也会创建新层级结构。
- 层级结构标题改为可编辑输入框，保存时写入 `hierarchyName`。
- 层级卡片右上角增加删除结构按钮。
- 层级项支持拖拽到同结构内其他层级前方，也支持拖到结构底部。
- 保存参数仍沿用原接口字段：`hierarchyName`、`levelOrder`、`levelName`、`hierarchyId` 等。

## 验证

- 已执行：`git diff --check -- apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.tsx`
- 结果：通过。

## 未执行

- 未运行构建、ESLint、单元测试。本次为维度层级弹窗局部交互调整，仅做静态 diff 检查。

## 风险

- 未做浏览器拖拽手工验证，实际拖拽命中区域可能还需要按 UI 反馈微调。
- 删除已有层级结构后，是否物理删除历史层级依赖后端 `hierarchy/edit` 对提交全量数据的处理方式。

## 是否需要更新 .ai 长期文档

- 不需要。

## 追加：接口参数对齐

用户补充 `hierarchy/edit` 接口后，继续对齐参数格式：

- 新增层级记录显式传 `hierarchyId: null`，编辑层级保留已有 `hierarchyId`。
- `configJson` 改为 JSON 对象传输，不再在提交前 `JSON.stringify`。
- 类型 `DimensionHierarchyEditItem.configJson` 扩展为 `Record<string, unknown> | string`，用于兼容接口提交对象与历史查询返回字符串两种情况。
- 类型 `DimensionHierarchyEditItem.hierarchyId` 扩展为 `null | number`。

验证：

- 已执行：`git diff --check -- apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/dimensionOperateDrawer/HierarchyModal.tsx apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/types/dimensionModeling.types.ts`
- 结果：通过。
