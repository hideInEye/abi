# 指标自定义衍生计算逻辑引用分组调整 Run Log

## 基本信息

- 日期：2026-07-07
- 任务名称：metric-custom-derived-reference-groups
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Project Analyst、Planner、Developer、Regression、Review、Knowledge
- 任务类型：限定范围前端 UI 数据展示与交互逻辑调整

## 需求摘要

修改指标创建/编辑第二步中“衍生指标 + 自定义类”计算逻辑区域右侧“点击引用字段”的数据展示和插入逻辑：不再按维度/度量/日期展示，改为按当前已查询指标列表中的 `indicatorClass === 'atomic'` 和 `indicatorClass === 'derived'` 展示“原子指标”和“派生指标”两组，并沿用现有点击插入表达式交互。

## 影响范围

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.TechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExtendedTemplateParams.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExpressionEditor.tsx`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.TechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExtendedTemplateParams.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.ExpressionEditor.tsx`

## 实现说明

- 在 `KnowledgeOperateDrawer.tsx` 中基于已查询的 `indicatorOptionSource` 生成 `referenceMetricOptions`，只保留 `indicatorClass === 'atomic'` 或 `indicatorClass === 'derived'` 的指标。
- 通过 `TechnicalStep` 和 `ExtendedTemplateParams` 将 `referenceMetricOptions` 传递到自定义类计算逻辑编辑器。
- 在 `knowledgeOperateDrawer.ExpressionEditor.tsx` 中停止复用旧 `QuoteField` 的维度/度量/日期树，改为本地构造“原子指标”和“派生指标”两组树数据。
- 点击树中叶子节点时仍调用原 `insertCode`，插入 `##techId##` 到 `expr` 并更新 `relItemId`，保留现有插入交互。
- 复用了原右侧引用区域 class 和布局结构，未新增或修改样式 class。

## 测试记录

### 执行的命令

- 未执行构建/测试命令。

### 测试结果

按用户要求，本轮不运行构建/测试，由主线程执行。

### 失败和修复过程

无。

## 回归检查

- 已确认引用列表数据来源为 `KnowledgeOperateDrawer.tsx` 中现有查询结果 `indicatorOptionSource`，没有新增接口请求。
- 已确认原子指标组筛选条件为 `item.indicatorClass === 'atomic'`。
- 已确认派生指标组筛选条件为 `item.indicatorClass === 'derived'`。
- 已确认自定义类计算逻辑编辑器右侧不再调用旧 `QuoteField` 的维度/度量/日期分组逻辑。
- 已确认点击引用项仍进入原 `insertCode`，插入表达式和 `relItemId` 更新逻辑未改。
- 已确认未修改样式 class，未做视觉调整。

## Review 结果

本轮修改范围符合限定要求，未触及提交 payload 构建、衍生模板非自定义类配置、派生指标条件构建器、维度配置或表格展示逻辑。

## 发现的问题

后续页面验证发现两处问题：

- 点击引用指标时原实现绕过 CodeMirror selection，直接把 token 拼接到表达式末尾，导致无法插入到当前光标处。
- 表达式预览直接展示 `##id##` token，且自定义表达式校验未识别指标 token，导致误报“表达式未引用任何变量或指标”。

已修复：

- 引用指标插入改为优先调用 CodeMirror `insertText`，按当前光标/选区插入。
- `extractUniqueIds` 改为支持字符串和数字 ID：`/##([^#]+)##/g`。
- 自定义表达式校验增加指标 token 识别。
- 自定义类表达式预览将 `##id##` 替换为引用指标名称展示。
- 新增 `knowledgeOperateDrawer.utils.test.ts` 覆盖字符串 token 提取。

## 本轮经验

指标建模自定义衍生表达式引用区域原先复用跨模块 `QuoteField`，该组件内置维度/度量/日期分组。针对本需求，在当前表达式编辑器内做局部引用树更安全，可避免影响其他调用方。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

已由主线程执行：

- `/usr/local/bin/pnpm test`：通过，`TEST_EXIT:0`。
- `/usr/local/bin/pnpm --filter chatbi build`：通过，`BUILD_EXIT:0`。

## 未解决问题

无。
