# 一键维度映射去除映射范围

## 基本信息

- 日期：2026-08-10
- 任务名称：dimension-batch-mapping-remove-range
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md` 当前仍为历史报告模式需求；本轮以用户追加的本体网络一键维度映射 UI 调整需求为准
- 执行 AI：Codex
- 涉及 agent：Developer、Test、Regression、Knowledge
- 任务类型：ABI 本体网络 / 一键维度映射抽屉 UI 简化

## 需求摘要

一键维度映射抽屉中去掉“映射范围”，语义来源区域只保留一个“数据”树形下拉框。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionBatchMappingDrawer.tsx`

## 修改内容

- 移除“映射范围”表单项。
- 移除 `schemaNames` 状态和相关 set/reset 逻辑。
- 将语义来源区布局从双列调整为单列，只展示“数据”树形下拉。

## 非目标

- 不修改数据语义组加载、树形下拉、字段解析、已存在字段识别或批量提交逻辑。
- 不修改一键映射维度接口参数结构。
- 不修改维度自定义流程。

## 回归检查

- 选择“数据”后仍加载该数据语义组下全部数据语义字段。
- 预览表和批量提交逻辑不变。
- 文件中已无 `schemaNames` / “映射范围”残留。

## 测试记录

### 执行命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/*.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：1 个测试文件、12 个用例通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi build`：通过。

### 构建警告

构建仍输出既有警告：

- UnoCSS 无法加载图标 `selector-popover`、`selector-trigger`。
- 部分模块同时被动态导入和静态导入，Vite 提示不会拆到独立 chunk。
- 部分构建产物超过 500 kB。

这些警告不属于本轮改动引入。

## 是否需要更新 AI 系统

- `.ai/prompts/`：不需要。
- `.ai/agents/`：不需要。
- `.ai/skills/`：不需要。
- `.ai/mcp/`：不需要。
- `.ai/context/`：不需要。
- `.ai/checklists/`：不需要。
- `.ai/decisions/`：不需要。

## 未解决问题

暂无。
