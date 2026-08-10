# 衍生指标第二步指标编码字段

## 基本信息

- 日期：2026-08-10
- 任务名称：metric-derivative-techname-field
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md` 当前仍为历史报告模式需求；本轮以用户追加的指标建模需求为准
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Developer、Test、Regression、Knowledge
- 任务类型：ABI 本体网络 / 属性建模 / 指标建模表单调整

## 需求摘要

在本体网络-属性建模-指标建模的新建/编辑指标抽屉中，当指标类型为“衍生指标”时，在第二步“技术属性”上方增加“指标编码”字段。字段名称使用 `techName`，并且不能与“派生指标”的编码字段混用；不修改其他逻辑。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.TechnicalStep.tsx`

## 修改内容

- 在衍生指标第二步中，在“衍生模板”上方新增“指标编码”输入框。
- 表单字段使用 `name="techName"`，复用现有 `validateTechName` 校验。
- 衍生指标技术步骤必填字段中加入 `techName`。
- 指标类型切换时清理隐藏的 `techName`，避免串到派生或原子指标。
- 提交 payload 时仅对非衍生的非原子编辑场景继续沿用旧的 `delete payload.techName` 行为；衍生指标保留 `techName`。

## 回归检查

- “派生指标”仍使用原有 `indicatorCode` 字段和派生逻辑配置区块。
- 衍生模板参数、表达式、维度配置步骤未调整。
- 编辑衍生指标时，`buildFormValuesFromDetail` 仍从详情数据回填 `techName`。
- 普通指标列表、搜索、批量原子指标映射未修改。

## 测试记录

### 执行命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/*.test.ts`
- `git diff --check`
- `pnpm --filter chatbi build`

### 测试结果

- Vitest：3 个测试文件、11 个用例通过。
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
