# 指标聚合方式与自定义原子指标技术属性 Run Log

## 基本信息

- 日期：2026-09-18
- 任务：metric-aggregation-custom-atomic
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“指标建模聚合方式与自定义原子指标技术属性”
- 影响应用：`apps/abi`

## 最终行为

1. 一键映射原子指标的聚合方式改为多选，默认 `SUM` 且至少保留一项；九种聚合方式统一使用大写枚举。
2. 一键映射请求保持原有对象数组结构，每个来源字段新增 `agg: { type: 'simple', data: [...] }`；`projectionFunc` 继续写入首个选项对应的旧小写兼容值。
3. 派生指标的原子指标摘要通过指标建模组件内 CSS Module 展示全部聚合能力；中文名称与等宽枚举代码可随容器换行，不修改全局 Ant Design 样式。
4. 派生指标统计口径第一行展示日期范围和单选“派生聚合方式”，第二行展示时段范围和主体维度；聚合选项只来自当前原子指标，新增或切换时默认第一项，编辑时优先恢复合法的 `calcLogic.aggMethod`。
5. 派生指标提交大写 `calcLogic.aggMethod`，旧 `projectionFunc` 继续使用首项的小写兼容值；读取时优先使用 `agg.data`，并兼容历史 `projectionFunc`。
6. 自定义原子指标改为“业务配置 → 技术属性”两步，第一步不再显示英文名称，且原子指标继续隐藏预计算配置。
7. 自定义原子指标技术属性包含指标编码、数据、来源字段、聚合逻辑表达式、16 个函数快捷项和字段元信息；来源字段选项同时展示中英文名称、字段类型和语义类型。
8. 自定义原子指标提交顶层 `techName`、`relSchemaId`、`relViewId`、`semanticType`，并将单个来源字段也包装为 `techId: [{ ... }]`；`calcLogic` 使用 `bizeName`、`techName` 与 `{ type: 'complex', data: 表达式 }`，来源中英文名称分别按 `_#_` 和 `.` 规则保存。
9. 新增、编辑和一键映射仍由既有成功响应门禁控制：接口失败不会关闭抽屉或触发成功后的刷新。

## 主要修改文件

- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeAtomicMappingDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeOperateDrawer.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.AtomicTechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.DerivedLogicBuilder.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/knowledgeOperateDrawer.TechnicalStep.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/aggregation.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/atomicMapping.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/atomicMetricSource.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/customAtomic.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/utils/knowledgeSubmitPayload.ts`
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/hooks/useKnowledgeExtraction.ts`
- 本次对应的 CSS Module、类型、常量与小模块测试。

## 验证结果

- 本次修改定向 Vitest：通过，9 个测试文件、95 项测试全部通过。
- 覆盖内容：聚合枚举与新旧兼容、一键映射多选报文、派生聚合默认/切换/回显、自定义原子指标函数插入与名称格式、`complex` 报文、两步流程、预计算隐藏和接口成功门禁静态契约。
- 指标建模目录回归：151 项通过，3 项既有 `IndicatorSearchSelect.test.tsx` 失败；失败原因为旧测试直接调用使用 Hook 的函数组件，触发 React `Invalid hook call`，该组件及测试不在本次修改范围。
- ABI TypeScript 检查：全量命令未通过，仓库存在大量既有类型错误；过滤本次 `metric-modeling` 文件后没有本次变更引入的类型错误。
- 改动 TypeScript/TSX ESLint error 检查：本次文件通过；`useKnowledgeExtraction.ts` 仍有两处本次未修改的既有 `no-void` 错误，因此未顺带修改需求外代码。
- `git diff --check`：通过。
- 本次 `techId` 单元素数组协议补充按用户要求未执行测试和构建。

## 回归与边界

- 保留了映射抽屉中用户已有的 `style={{width:120}}` 宽度修改。
- 未修改衍生模板参数、维度规则、指标列表名称展示、接口路径、全局样式或本体网络其他模块。
- 组件结构静态核对确认：多聚合标签使用可换行 flex 布局；选择框沿用响应式标签收缩；所有新增视觉样式均位于指标建模 CSS Module。
- 未在已登录、已连接后端数据的浏览器中执行真实新增/编辑请求；接口报文与回显通过纯函数和静态契约测试验证。

## AI 系统更新判断

- `.ai/requirements/`：已更新本轮目标、非目标、验收标准、测试要求和完成状态。
- `.ai/runs/`：已新增本 Run Log。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：无需更新；本轮未改变长期架构、开发规则、角色流程或外部工具约定。
