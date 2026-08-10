# 属性建模闪烁修复

## 基本信息

- 日期：2026-08-10
- 范围：`apps/abi` 本体网络属性建模入口
- 类型：前端 UI 闪烁问题修复

## 需求目标

- 按用户指定方案恢复三个属性建模页签。
- `ATabs` 只负责顶部导航，不再通过 `items.children` 包裹重业务组件。
- `DimensionModeling`、`MetricModeling`、`SemanticTag` 在 Tabs 外层按 `activeTab` 条件渲染。
- 根据用户验证结果，移除属性建模入口外层 `ACard`，避免侧边栏收起/展开时触发布局闪烁。
- 保留 query `tab` 同步、页签切换和 `switchToMetricTab` 能力。
- 不修改维度、指标、标签语义组件内部逻辑。
- 不修改 Splitter 和全局二级菜单。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/index.tsx`
- `apps/abi/src/styles/scss/table.scss`

## 变更内容

1. `tabItems` 只保留 `key` 和 `label`，不再配置 `children`。
2. `ATabs` 增加 `animated={false}`，并添加局部 class `abi-attr-modeling-tabs--nav-only`。
3. Tabs 外层新增内容容器，通过 `activeTab` 条件渲染三个业务组件。
4. 在 `table.scss` 为当前 Tabs 实例隐藏 content holder，避免其参与重内容布局。
5. 移除属性建模入口外层 `ACard`，改用普通 flex 容器承载页签和内容区。

## 验证命令

```bash
git diff --check -- apps/abi/src/pages/workbench/ontology-kg/label-meaning/index.tsx apps/abi/src/styles/scss/table.scss .ai/runs/2026-08-10-attribute-modeling-tabs-nav-only/RUN_LOG.md
```

结果：通过。

```bash
pnpm --filter chatbi build
```

结果：通过。构建过程中仍有既有 warning，包括 UnoCSS `selector-popover` / `selector-trigger` 图标加载失败、动态/静态导入 chunk 提示和部分 chunk size 提示；没有构建失败。

## 回归检查

- query `tab` 同步逻辑保留。
- 页签切换逻辑保留。
- `DimensionModeling` 的 `onGoMetricModeling` 能力保留。
- 业务组件内部逻辑未修改。

## 长期文档更新判断

- `.ai/prompts/`：不需要更新。
- `.ai/agents/`：不需要更新。
- `.ai/skills/`：不需要更新。
- `.ai/mcp/`：不需要更新。
- `.ai/context/`：不需要更新。
- `.ai/checklists/`：不需要更新。
- `.ai/decisions/`：不需要更新。
