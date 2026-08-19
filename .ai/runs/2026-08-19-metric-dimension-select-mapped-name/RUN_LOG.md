# Metric Dimension Select Mapped Name Run Log

## 时间

- 2026-08-19 15:31:33 CST

## 需求

- 指标创建/编辑中，派生指标和衍生指标第三步“维度配置”的维度选择名称展示，需要匹配 `_#_` 和 `_ # _` 映射规则。
- 展示时只显示字段名部分，例如 `交易明细表_ # _收货城市` 展示为 `收货城市`。

## 变更

- `knowledgeOperateDrawer.utils.ts`
  - 增加 `formatMappedDimensionOptionTitle`，复用已有 `_#_` / `_ # _` 映射清洗逻辑生成维度选项标题。
- `knowledgeOperateDrawer.DimensionStep.tsx`
  - 维度接口列表 option title 改为格式化展示。
  - 编辑回显的已选维度 snapshot title 也做同样清洗；如果后端返回对象没有 `title`，但有 `bizName` / `zhName` / `dimName`，同样按映射规则生成展示名。
- `knowledgeOperateDrawer.utils.test.ts`
  - 增加维度选择标题 `_ # _` 显示规则测试。

## 非目标

- 不修改维度选择提交结构。
- 不修改维度分组加载、Transfer 行为、目标 key 或后端字段。
- 不处理上一轮原子指标英文名称相关未提交改动。

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/*.test.ts`
  - 3 个测试文件通过，17 个用例通过。
- `git diff --check`
  - 通过。
- `pnpm --filter chatbi build`
  - 通过。
  - 仍有项目既有警告：UnoCSS 图标 `selector-popover` / `selector-trigger` 加载失败、部分 chunk 超过 500KB、部分动态/静态 import chunk 提示。

## 回归检查

- 第三步左侧树节点和右侧已选列表都来自同一份 `title`，因此都会使用清洗后的展示名。
- 维度 id、`dimensionFieldIds` 和保存 payload 不变。

## .ai 长期文档

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
- `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是历史 chat/report 需求，与本轮本体网络指标维度选择显示修复不一致；本轮按用户最新明确需求执行。
