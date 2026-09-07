# 自定义指标预计算配置显示条件修复运行记录

## 基本信息

- 日期：2026-09-07。
- 需求：自定义创建指标时，原子指标隐藏“预计算配置”，仅派生指标和衍生指标显示。
- 影响模块：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`。

## 实现结果

1. 新增统一显示判断：仅 `derived`、`derivative` 返回显示，`atomic` 和未知类型不显示。
2. 业务配置步骤根据指标类型动态渲染“预计算配置”，切换类型后立即更新。
3. 原子指标的第一步和提交校验不再包含隐藏的预计算字段；派生、衍生指标继续沿用原校验。
4. 未修改指标接口、提交参数、预计算配置结构和默认值。

## 测试与验证

- `pnpm exec vitest run .../knowledgeOperateDrawer.utils.test.ts .../precomputeConfig.test.ts`：通过，2 个文件、28 个用例。
- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`：通过，11 个文件、125 个用例。
- `pnpm --filter chatbi build`：通过；仅有既有 UnoCSS 图标、动态/静态导入和 chunk 体积警告。
- `pnpm --filter chatbi typecheck`：未通过，仍被仓库既有路由、共享包声明和其他模块类型错误阻塞；额外筛查确认本次改动的三个源码/测试模块没有出现在诊断中。
- `pnpm test`：本次相关测试及本体网络接口覆盖测试通过；全仓结果为 66 个文件通过、2 个文件失败，618 个用例通过、1 个用例失败。失败为既有 Chat 问题：
  - `apps/chat/src/service/api/app.test.ts` 无法解析 `@/constant/chat`。
  - `apps/chat/src/pages/chat/workshop/assistantResources.test.ts` 的旧期望缺少现有返回字段 `description`、`prologue`。
- `git diff --check`：通过。

## 回归检查

- 原子指标：预计算模块隐藏，隐藏字段不参与校验。
- 派生指标：预计算模块和既有字段校验保留。
- 衍生指标：预计算模块和既有字段校验保留。
- 未改动指标保存、编辑回显、技术属性、维度配置及本体网络其他模块。
- 保留了工作区中用户和上一任务的未提交改动。

## AI 开发系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`，记录本轮目标、非目标、验收标准和测试要求。
- 已新增本运行记录。
- 本次是指标建模局部显示条件修复，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
