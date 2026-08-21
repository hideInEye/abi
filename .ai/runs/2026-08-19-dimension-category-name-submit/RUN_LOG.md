# Dimension Category Name Submit Run Log

## 时间

- 2026-08-19 14:54:32 CST

## 需求

- 属性建模中维度创建/编辑时，`dimCategory` 最终提交必须是中文名称。
- 手动输入维度归类时，直接提交手动输入的中文。
- 选择接口返回的推荐归类时，即使表单控件内部值是 id，提交也必须转成中文 label。
- 编辑接口返回 `dimCategory` 为 id 时，如果不修改或切换选项，最终提交也要是中文名称。

## 变更

- `BaseInfoTab.tsx`
  - 为维度归类维护隐藏字段 `dimCategoryName`。
  - 选择推荐项时从 option label 同步中文名。
  - 编辑回显 id 后，待推荐项加载完成会根据 id 映射中文名。
  - 手动输入时同步手动文本作为中文名。
- `DimensionOperateDrawer.tsx`
  - 保存时显式取 `dimCategoryName`，防止切换 tab 后提交对象遗漏。
- `dimensionModeling.mapper.ts`
  - `buildSubmitPayload` 中 `dimCategory` 优先取 `dimCategoryName`，没有时再回退到 `dimCategory`。
- `dimensionModeling.types.ts`
  - `DimensionFormValues` 增加内部表单字段 `dimCategoryName`。
- `dimensionModeling.mapper.test.ts`
  - 增加推荐项 id 提交中文名称、手动输入提交原文本的回归测试。

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/*.test.ts`
  - 1 个测试文件通过，19 个用例通过。
- `git diff --check`
  - 通过。
- `pnpm --filter chatbi build`
  - 通过。
  - 仍有项目既有警告：UnoCSS 图标 `selector-popover` / `selector-trigger` 加载失败、部分 chunk 超过 500KB、部分动态/静态 import chunk 提示。

## 回归检查

- 只调整维度创建/编辑的维度归类提交值映射，不修改维度名称、语义来源、关联字段、层级配置和指标逻辑。
- 表单控件仍保留原有推荐项选择与手动 tags 输入方式。

## .ai 长期文档

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
- `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是历史 chat/report 需求，与本轮维度建模修复不一致；本轮按用户最新明确需求执行。
