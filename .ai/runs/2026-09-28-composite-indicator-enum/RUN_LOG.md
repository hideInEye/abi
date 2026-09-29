# 复合指标枚举值调整 Run Log

## 基本信息

- 日期：2026-09-28
- 任务名称：composite-indicator-enum
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及阶段：分析、开发、测试、回归、Review、知识记录
- 任务类型：缺陷修复

## 需求摘要

将已改名为“复合指标”的指标类型枚举从 `derivative` 调整为 `composite`，覆盖选项、筛选、表单分支、计算逻辑和函数字典选择。

## 影响范围

- ABI 本体网络指标建模的复合指标创建与编辑流程。
- 指标列表类型展示与类型筛选。
- 复合指标模板计算逻辑及自定义表达式函数字典。
- 指标建模相关小模块测试。

## 修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/constants/metricModeling.constants.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.TechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivativeCustomTechnicalSection.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeOperateDrawer.utils.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeSubmitPayload.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/ontologyFunctionDictionary.ts`
- 上述模块对应测试文件。

## 实现说明

- “复合指标”的 `indicatorClass` 选项值、筛选值和列表映射键统一改为 `composite`。
- 复合指标表单判断、模板字段构建、自定义来源字段与计算逻辑分支统一识别 `composite`。
- 自定义表达式的前端字典类型标识改为 `composite`，后端既定字典类型仍为 `ontology_fun` 与 `ontology_derivative`。
- 未修改 `atomic`、`derived`、模板报文结构、组件文件名或无关业务逻辑。

## 测试记录

### 执行的命令

- 在仓库根目录运行四个定向 Vitest 文件。
- 在 `apps/abi` 目录运行四个定向 Vitest 文件。
- 在 `apps/abi` 目录对本次 TS/TSX 文件执行定向 ESLint。
- `git diff --check`。

### 测试结果

- ABI Vite 配置下 4 个测试文件、47 个测试全部通过。
- 补充格式调整后，UI 契约测试 12 个测试再次通过。
- ESLint 无 error；报告 71 个既有格式和排序 warning，未执行自动修复，避免修改需求外代码。

### 失败和修复过程

- 首次从仓库根目录执行时，函数字典测试无法解析 ABI 的 `@` 路径别名；改为在 `apps/abi` 目录使用应用 Vite 配置后通过。
- 直接指定 `apps/abi/vite.config.ts` 时因根目录环境变量缺失导致配置加载失败；未修改配置，改用应用工作目录执行。

## 回归检查

- 原子指标仍使用 `atomic`。
- 派生指标仍使用 `derived`。
- 复合指标模板仍生成原有 `indicator_templates` 结构。
- 复合自定义表达式仍请求 `ontology_derivative` 字典。
- 运行时代码不再使用 `derivative` 作为 `indicatorClass` 枚举值。

## Review 结果

修改限定在指标建模枚举及对应判断，未改接口字段和模板结构，未执行全量格式化或无关重构。

## 发现的问题

ABI Vitest 结束时提示 Vite server close timeout，但测试进程正常完成且全部用例通过；该问题不是本次改动引入。

## 本轮经验

ABI 中依赖 `@` 别名的测试应从 `apps/abi` 工作目录执行，以加载应用级 Vite 配置和环境变量。

## 是否需要更新 AI 系统

- `context/`：不需要，项目架构未变化。
- `prompts/`：不需要。
- `agents/`：不需要。
- `skills/`：不需要。
- `mcp/`：不需要。
- `checklists/`：不需要。
- `decisions/`：不需要，没有新增架构决策。

## 后续建议

部署联调时确认后端列表、详情与保存接口均返回或接收 `indicatorClass: composite`。

## 未解决问题

无本需求内未解决问题。
