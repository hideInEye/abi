# 派生指标主体维度多选与维度交叉 Run Log

## 基本信息

- 日期：2026-09-08
- 分支：`fix/zanghb-20260901-develop-1.1.2`
- 模块：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`
- 需求：派生指标第二步支持多个主体维度，并在主体维度后增加“是否维度交叉”；同步调整 `calcLogic` 提交与编辑回显协议。

## 实现内容

- 主体维度由单选 `TreeSelect` 改为多选，继续使用现有维度树，分组节点不可选，表单至少需要一个叶子维度。
- 增加“是否维度交叉”复选框，表单内部使用布尔值，提交时转换为 `isCrossDim: "是" | "否"`。
- `calcLogic.subjectDimension` 统一提交为数组，每项包含 `dim_id` 和 `dim_name`。
- 编辑时支持新的主体维度数组；已有单对象数据会转换成单项选择，保存时输出数组。
- 表单保存维度 ID 顺序和 ID 到名称的映射，避免从组合展示文本推断 `dim_name`。
- 业务预览展示所有主体维度；SQL Preview 将所有主体维度加入 `GROUP BY` 并与第三步统计维度去重。
- 下一步校验改为校验主体维度数组。

## 测试与验证

- 通过定向 Vitest：
  - `indicatorApiAdapter.test.ts`
  - `knowledgeSubmitPayload.test.ts`
  - `derivedMetricPreview.test.ts`
  - `precomputeConfig.test.ts`
  - 共 4 个测试文件、56 个用例通过。
- 通过 ABI 生产构建：`pnpm --filter chatbi build`。
- 通过 `git diff --check`。
- `pnpm --filter chatbi typecheck` 未通过；仓库当前已有大量与本次需求无关的类型基线错误，包括 `ServiceConfigItem.chatURL`、路由生成类型、`@sa/axios` 和 React 类型解析等。对输出按本次 metric-modeling 文件过滤后，没有发现本次修改文件的类型错误；Vite 生产构建成功。

## 回归检查

- 未修改原子指标、衍生指标、第三步统计维度、维度接口和请求封装。
- 新提交始终使用数组协议；旧单主体维度数据仅在编辑解析层兼容。
- 未引入新的跨模块状态或共享组件，表单、协议适配和测试仍位于指标建模同一功能域。
- 构建中的 UnoCSS 图标、动态/静态 import 混用和大 chunk 提示为既有警告。

## AI 系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`，记录本次目标、非目标、影响范围与验收标准。
- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`；本次是局部表单和接口字段调整，没有形成新的项目级架构约束。
