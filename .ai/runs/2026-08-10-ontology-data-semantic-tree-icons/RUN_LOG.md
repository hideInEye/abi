# 本体网络数据树形下拉图标

## 基本信息

- 日期：2026-08-10
- 任务名称：ontology-data-semantic-tree-icons
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md` 当前仍为历史报告模式需求；本轮以用户追加的本体网络数据树形下拉图标需求为准
- 执行 AI：Codex
- 涉及 agent：Developer、Test、Regression、Knowledge
- 任务类型：ABI 本体网络 / 数据树形下拉展示微调

## 需求摘要

为本体网络刚合并后的“数据”树形下拉补充节点图标，参考 `apps/chat` 的 `ChatInput` 数据语义树展示方式，分组节点使用 `FolderOutlined`，数据语义叶子节点使用 `FileTextOutlined`。

## 影响范围

- `apps/abi/src/components/tableSemantics.tsx`
  - 创建/编辑维度、创建/编辑标签、一键映射指标、技术术语计算配置共用的数据树形下拉。
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionBatchMappingDrawer.tsx`
  - 一键映射维度抽屉中的数据树形下拉。

## 修改内容

- 引入 `FileTextOutlined` 和 `FolderOutlined`。
- 新增树节点标题渲染函数：
  - 数据语义组节点前展示 `FolderOutlined`。
  - 数据语义叶子节点前展示 `FileTextOutlined`。
- 保留原有树节点 value、选择行为和后端字段传递逻辑。
- 因 `title` 改为 ReactNode，补充 `searchLabel` 并使用 `filterTreeNode`，避免影响下拉搜索。

## 非目标

- 不修改数据选择、懒加载、回显、字段提交或批量映射逻辑。
- 不引入新的样式文件。
- 不修改 `apps/chat` 代码。

## 回归检查

- 公共 `TableSemantics` 仍按叶子节点选择数据语义，父级数据语义组不可选。
- 维度一键映射仍按父级数据语义组选择并映射该组下全部数据语义，子节点仅展示。
- 下拉搜索仍基于原始文本 label。

## 测试记录

### 执行命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/entity/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/*.test.ts apps/abi/src/pages/workbench/ontology-kg/shared-network-types.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：9 个测试文件、51 个用例通过。
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
