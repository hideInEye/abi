# 本体网络卡片布局调整

## 目标
- 本体网络卡片视图对齐数据准备卡片布局。
- 卡片固定最大宽度，并按容器宽度计算每行可展示数量，支持自动换行。
- 保持数据准备全局卡片样式，不覆盖全局样式。

## 修改内容
- 修改 `OntologyCardList`：
  - 去掉监听和动态列计算。
  - 直接使用数据集同款 `abi-card-grid / abi-card-grid-inner / abi-data-card` 全局卡片结构。
- 修改本体网络卡片专用样式：
  - 去掉 `nowrap`、`min-width: max-content`、自定义宽度和自定义 grid 覆盖。
  - 保留 AntD Button 在卡片底部的轻量兼容样式。
- 顺手移除实体定义表格第一列残留的 `fixed: left`，保持仅复选框列固定。

## 验证
- 已运行静态检查：
  - `rg "fixed:\\s*['\\\"]left|fixed:'left'|fixed: 'left'" apps/abi/src/pages/workbench/ontology-kg -g '*.tsx'`
  - `rg "ResizeObserver|card-layout|calculateOntologyCardColumns|getOntologyCardGridTemplate|ONTOLOGY_CARD" apps/abi/src/pages/workbench/ontology-kg apps/abi/src/styles/scss/table.scss -g '*.tsx' -g '*.ts' -g '*.scss'`
  - `git diff --check -- apps/abi/src/pages/workbench/ontology-kg/components/OntologyCardList.tsx apps/abi/src/pages/workbench/ontology-kg/utils/card-layout.ts apps/abi/src/styles/scss/table.scss`
- 未运行构建和测试。

## 回归关注
- 本体网络属性建模、实体定义、关系配置、标签语义卡片视图应按容器宽度换行。
- 数据准备页面不应受影响。
