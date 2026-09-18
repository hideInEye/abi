# 原子指标聚合类型分流运行记录

## 运行信息

- 日期：2026-09-18
- 范围：ABI 本体网络指标建模
- 需求：按 `agg.type` 区分一键映射原子指标与自定义原子指标的编辑、展示、预览和提交行为

## 完成内容

1. `simple` 原子指标编辑改为单页业务配置，并在当前页增加局部技术定义区域，可维护所属数据语义、来源字段和多选聚合方式。
2. `simple` 保存时保持 `techId` 为单元素对象数组，来源字段聚合结构保持 `{ type: 'simple', data: [...] }`，兼容字段继续使用首个聚合方式。
3. `complex` 自定义原子指标继续使用两步技术属性流程，既有表达式编辑与校验不变。
4. 派生指标引用 `complex` 原子指标时，界面显示“自定义聚合方式表达式”并支持查看原表达式；表单值、预览表达式和接口报文继续使用真实表达式。
5. 聚合定义兼容对象和 JSON 字符串结构，派生选项缺少完整聚合元数据时继续请求详情，避免把自定义表达式误判为默认 `SUM`。
6. 新增样式均限定在指标建模组件 CSS Module 内，没有修改全局 Ant Design 样式。
7. 将“技术定义”调整至“语义信息”之前，并删除技术定义字段下方的辅助说明文字。

## 验证结果

- 定向 Vitest：通过。7 个测试文件、100 项用例全部通过。
  - `api-response-contract.test.ts`
  - `knowledgeOperateDrawer.MetricAggregationUi.test.ts`
  - `aggregation.test.ts`
  - `atomicMetricSource.test.ts`
  - `derivedMetricPreview.test.ts`
  - `knowledgeOperateDrawer.utils.test.ts`
  - `knowledgeSubmitPayload.test.ts`
- 局部 ESLint：通过。检查本次修改的指标建模组件、类型、常量和工具文件，无错误。
- ABI TypeScript：执行 `pnpm --filter chatbi typecheck` 时仍存在仓库既有基线错误；输出过滤 `metric-modeling|tableSemantics` 后无本次范围错误。
- `git diff --check`：通过。
- 未执行全量构建；本需求测试要求明确只做定向验证。

## 回归检查

- `simple` 编辑没有第二步，技术定义位于第一步并要求聚合方式至少选择一项。
- `complex` 编辑仍保留业务配置与技术属性两步。
- 派生指标选择普通聚合时仍提交枚举；选择自定义聚合时提交真实表达式，不提交展示文案，也不回退到 `SUM`。
- 接口保存仍等待成功响应后关闭抽屉；失败响应保持当前表单。
- 未修改共享 `TableSemantics` 组件和任务外逻辑，未覆盖目录中已有未提交改动。

## 未执行项与风险

- 未连接真实后端进行编辑回显和保存联调，也未在已登录浏览器中完成手工交互检查；当前结论基于类型分流实现、请求构建逻辑和定向自动化测试。
- Sass 输出包含旧版 JS API 弃用警告，为现有工具链提示，不影响测试结果。
- 本次追加的纯布局与文案调整按用户要求未运行测试或构建。

## AI 开发系统更新评估

- 已更新：`.ai/requirements/CURRENT_REQUIREMENT.md`、本运行记录。
- 无需更新：`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
