# RUN LOG: ontology dimension edit validation scroll

## 基本信息

- 日期: 2026-08-14
- 模块: apps/abi/src/pages/workbench/ontology-kg
- 需求来源: 用户本轮消息
- 说明: `.ai/requirements/CURRENT_REQUIREMENT.md` 仍是聊天报告旧需求，和本轮本体网络表单修复需求不一致；本次按用户最新消息执行，并记录该偏差。

## 目标

1. 修复维度编辑时数据语义只显示 id 的回显问题。
2. 修复维度编辑关联字段表格中 `_#_` 映射名称展示为表名加字段名的问题，展示字段名部分。
3. 自定义维度中文名和英文名显示 required 红星。
4. 自定义维度/指标名称查重改为输入后 600ms 防抖校验。
5. 本体网络表单校验失败时使用 antd Form API 定位到第一个错误字段。

## 变更摘要

- `TableSemantics` 兼容 `schemalist` / 分组接口的 `rows/list/records/data` 返回结构，并在编辑态保持当前 schema id 值类型，确保 TreeSelect 能匹配 label。
- 维度关联字段表格展示通过 `_#_` 拆分映射中文名，展示后半段字段名。
- 维度 `zhName` / `englishName` 与指标 `bizName` / `indicatorCode` / `techName` 使用 `validateDebounce={600}` + `validateTrigger="onChange"`。
- 新增 `ontology-kg/utils/form-scroll.ts`，统一封装 `scrollToField` 定位逻辑。
- 接入维度、指标、标签语义、一键映射指标、实体、属性配置、关系、推荐问题、行业术语的保存/下一步校验失败定位。
- 指标多步骤表单保存失败时按第一个错误字段切换到对应步骤后再滚动。

## Subagent

- 已创建并关闭只读审计 subagent。
- subagent 负责扫描 `ontology-kg` 下手动 `form.validateFields()` 的表单入口，确认需要补滚动定位的文件清单。

## 验证

- `pnpm exec vitest run apps/abi/src/pages/workbench/ontology-kg/utils/form-scroll.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/utils/ontologyName.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeIndicator.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeSubmitPayload.test.ts`
  - 结果: 通过，5 个测试文件，34 条用例。
- `git diff --check`
  - 结果: 通过。
- `pnpm --filter chatbi build`
  - 结果: 通过。
  - 备注: 构建仍有既有警告，包括 UnoCSS icon `selector-popover` / `selector-trigger` 加载失败、部分动态/静态导入 chunk 警告、chunk 体积警告；未阻断构建。

## 回归检查

- 未修改一键映射维度/指标的接口入参拼接逻辑。
- 未改变数据语义 TreeSelect 的“只能选择子级数据语义”行为。
- 表单接口失败分支不因本次滚动定位而自动关闭窗口。
- 对已有工作区未提交改动未做回滚或覆盖。

## 长期文档评估

- `.ai/context/`: 暂不需要更新，本次是局部 UI/表单行为修复。
- `.ai/checklists/`: 可考虑后续补充“长表单校验失败需滚动到首个错误字段”规则，但本次未直接修改。
- `.ai/requirements/`: 当前 `CURRENT_REQUIREMENT.md` 与实际需求不一致，建议后续由用户或维护者更新。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/decisions/`: 暂不需要更新。
