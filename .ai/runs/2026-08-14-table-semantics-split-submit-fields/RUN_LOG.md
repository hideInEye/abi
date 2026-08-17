# RUN LOG: table semantics split submit fields

## 基本信息

- 日期: 2026-08-14
- 模块: `apps/abi/src/components/tableSemantics.tsx`
- 需求来源: 用户本轮反馈
- 说明: `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是 chat 报告旧需求，和本轮本体网络数据语义字段拆分修复不一致；本次按用户最新反馈执行。

## 问题

本体网络里“数据语义组 + 数据语义”合并成一个树形下拉后，界面只注册了展示字段 `semanticSchemaId`。

虽然选择数据语义时会通过 `form.setFieldsValue` 写入 `semanticGroupId` 和 `semanticsGroupId`，但这两个字段没有注册为 Form.Item。保存时业务代码通过 `form.validateFields()` 获取提交值，未注册字段可能不会进入返回值，导致 payload 中 `semanticsGroupId` 被过滤掉。

## 修复

- 在 `TableSemantics` 内部注册隐藏字段：
  - `semanticGroupId`
  - `semanticsGroupId`
- UI 仍然只显示一个“数据”树形下拉。
- 选择数据语义后，既保留新的合并下拉体验，也能把旧接口需要的数据语义组字段和数据语义字段拆开提交。

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts`
  - 结果: 通过，1 个测试文件，16 条用例。
- `git diff --check`
  - 结果: 通过。
- `pnpm --filter chatbi build`
  - 结果: 通过。
  - 备注: 仍有既有 Vite/UnoCSS 警告，包括 `selector-popover` / `selector-trigger` 图标加载失败、动态/静态导入 chunk 警告、chunk 体积警告；未阻断构建。

## 回归检查

- 未改变 TreeSelect 展示方式。
- 未改变选择数据语义时的 `setFieldsValue` 逻辑。
- 未改变维度/指标/标签各自 payload mapper。
- 未回滚或覆盖工作区既有未提交改动。

## 长期文档评估

- `.ai/context/`: 暂不更新，本次是局部 bug fix。
- `.ai/checklists/`: 可后续补充“合并展示字段时，提交所需拆分字段必须注册或显式补值”。
- `.ai/requirements/`: 当前 `CURRENT_REQUIREMENT.md` 与实际需求不一致，建议后续维护者更新。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/decisions/`: 暂不需要更新。
