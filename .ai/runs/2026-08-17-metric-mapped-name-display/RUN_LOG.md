# Metric Mapped Name Display Run Log

## 时间

- 2026-08-17 11:11:52 CST

## 需求

- 修改指标创建/编辑时的名称展示：
  - 派生指标的原子指标选择名称遇到 `_#_` 或 `_ # _` 映射格式时，只展示字段名部分。
  - 衍生指标第二步选择模板后的指标名称/表达式预览遇到映射格式时，只展示字段名部分。

## 变更范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeOperateDrawer.utils.ts`
  - 新增指标建模专用展示名格式化工具。
  - 保持全局 `ontologyName` 表名展示逻辑不变，只在指标创建/编辑下拉和预览场景取 `_#_` 后半段字段名。
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeOperateDrawer.tsx`
  - 原子指标和引用指标 option label 使用格式化后的字段名。
  - 计算逻辑元信息中的显示字段名也使用相同格式，避免后续预览带出表名。
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`
  - 派生条件字段下拉和预览中的字段名改为格式化展示。
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeOperateDrawer.utils.test.ts`
  - 补充 `_#_`、`_ # _`、原子指标选项和派生字段选项展示测试。

## 非目标

- 不修改指标提交字段拼接规则。
- 不修改指标列表和编辑表单主中文名的全局展示逻辑。
- 不处理工作区中已有的维度层级相关未提交改动。

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/*.test.ts`
  - 3 个测试文件通过，16 个用例通过。
- `git diff --check`
  - 通过。
- `pnpm --filter chatbi build`
  - 通过。
  - 仍有项目既有构建警告：UnoCSS 图标 `selector-popover` / `selector-trigger` 加载失败、部分 chunk 超过 500KB、部分动态/静态 import chunk 提示。

## 回归检查

- 原有指标建模 mapper 和 submit payload 测试保持通过。
- 本次只新增显示层格式化，不改变后端提交参数结构。
- `_#_` 和用户描述中的 `_ # _` 写法均覆盖。

## .ai 长期文档

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
- `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是历史需求，与本次指标建模修复不一致；本次按用户最新明确指令执行。
