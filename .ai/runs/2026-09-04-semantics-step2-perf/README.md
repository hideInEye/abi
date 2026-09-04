# 数据语义配置第二步挂载性能优化

## 基本信息

- 日期：2026-09-04
- 任务名称：semantics-step2-perf
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：性能优化（零视觉变化）

## 需求摘要

「新增/编辑数据语义」弹窗点击「下一步」进入第二步（字段语义配置）时，字段数多页面卡死。要求在不改变交互、校验、保存语义和视觉表现的前提下消除超线性成本。

## 影响范围

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/components/semantics-table-config.tsx`
- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/modules/semantics-table.tsx`

## 修改文件

- 同上两个文件

## 实现说明

卡顿根因（按影响排序）：

1. 第二步 ATable 无分页/虚拟滚动，N 个字段一次性挂载 4N 个 AForm.Item（保留，未动，见后续建议）。
2. 语义类型默认赋值写在每行 render 内：N 次渲染期 zustand `setFields`（多一轮全表重渲染）+ N 次 `form.setFieldValue`；rc-field-form 每次 notify 遍历全部已注册表单项（4N），合计 O(N²)。
3. mount 后 effects 连锁：`getSemanticTypeLabel`、`setBizNameOrAlias`、`initForm` 各逐字段调用 setFieldsValue/setFieldValue，N 次 notify × 4N 表单项 = O(N²)，且每次 `setFields` 触发一轮 4N 表单项全表重渲染。
4. `setTableName(fields, union, tablePrikey)` 写在 SemanticsTable 组件函数体，每次渲染递归遍历 union + 全量改字段。
5. `onNextStep` 人为 `await setTimeout 800ms` 拉长 loading 观感。

对应修改：

- **A（消渲染期逐行写 store）**：删除 gender 列 render 内的默认赋值分支，新增 `useLayoutEffect([fields, tablePrikey])` 批量计算：一次 `fields.map` 求出所有缺省语义类型（复用 `handleSemanticsShow`，含主键映射）与日期默认描述（复用 `withDateDefaultDesc`），一次 `setFields` + 一次 `form.setFieldsValue` 写完；第二轮进入即收敛。useLayoutEffect 保证绘制前写完，语义类型列不闪空值/⚠️ 图标。
- **B（notify 从 N 次降 1 次）**：`getSemanticTypeLabel`、`setBizNameOrAlias`、`initForm` 内 `setFormFieldValues` 三处逐字段表单写入各合并为单次 `setFieldsValue`。
- **C**：`setTableName` 用 `useMemo([fields, union, tablePrikey])` 包裹，仅依赖变化时执行（保持就地修改语义与首渲染正确性）；删除 `onNextStep` 中 800ms 人为等待。

行为等价性：

- 默认语义类型/日期默认描述的取值规则、触发时机（fields 稳定后、编辑回显后、AI帮填/主键联动后）与改前一致，仅从"渲染期逐行"改为"布局效应批量"。
- 表单最终值一致：新增模式表单 semanticType 存 value（改前 mount 时会被 getSemanticTypeLabel 覆写为 label 字符串），ASelect 经 option 匹配显示同一文案，视觉无变化；校验（required 非空）与保存报文（取 store fields）不受影响。
- 编辑模式 initForm 回显、主键单选联动、AI帮填逻辑未动。

## 测试记录

### 执行的命令

- `GetProblems`：semantics-table-config.tsx 无错误
- `npx tsc --noEmit -p apps/abi/tsconfig.json`（过滤 data-table-meaning）
- `git diff` 核对 semantics-table.tsx 仅两个 hunk

### 测试结果

config 文件零诊断错误。tsc 在 data-table-meaning 目录的报错（semantics-table.tsx L118/119/307/368/369、index.tsx L100、routes.ts L689）经 git diff 核对全部为存量问题或工作区其它任务改动，不在本次 diff 内。

### 失败和修复过程

无。UI 验证需登录环境：建议用 500+ 字段数据集验证「下一步」耗时与第二步显示（语义类型默认值、日期默认描述、编辑回显、保存校验）与改前一致。

## 回归检查

- 语义类型默认映射规则（主键/日期/维度/度量）未改，仅执行位置变化。
- 保存时 `formTableConfig.validateFields()` 覆盖范围不变（仍全量挂载、全量注册）。
- 第一步表单、步骤条、footer 按钮逻辑不变（仅删除 800ms 等待）。
- 日期默认描述需求（2026-09-03 run）行为保持：空描述自动填充、有值不覆盖。

## Review 结果

改动限定两个文件；无新增接口调用；无交互/视觉变化；渲染期不再有任何 store 写入。

## 发现的问题

- semantics-table.tsx 存在存量类型错误（InputField 可选字段、catch errorInfo 未标注类型），与本次无关，未扩大范围处理。

## 本轮经验

- rc-field-form 的 setFieldsValue/setFieldValue 每次 notify 遍历全部注册表单项：循环内逐字段调用即 O(N²)，必须聚合为单次调用。
- 渲染期逐行写外部 store 的模式在大数据量下必然多轮全表重渲染；默认值计算应收敛到 layout effect 批量写。
- 组件函数体内的 O(N) 数据加工（含递归遍历）会被多轮重渲染放大，应用 useMemo 按依赖缓存。

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

- 极端数据量（千级字段）仍需表格虚拟化/分页才能根治挂载成本；注意 rc-field-form 只校验已注册字段，分页会改变保存校验覆盖范围，需产品确认后再做。（已由第二轮改造解决主要矛盾：保存校验不再依赖表单注册，见下文）
- 可顺手修复 semantics-table.tsx 存量类型错误（InputField 字段可选性、catch 参数标注）。

## 未解决问题

无。

---

# 第二轮（2026-09-04）：去 Form.Item 化 + store 级保存校验

## 背景

第一轮 A+B+C 后用户实测仍卡 2~4 秒。诊断：超线性成本已消除，剩余耗时主体是第二步一次性挂载 4N 个 AForm.Item（rc-field-form Field 注册+订阅，挂载成本大头）+ 挂载后 1~3 次同步全表重渲染（layoutEffect 默认值写入、编辑模式 updateBizNameOrAlias/initForm 各一次 setFields）。虚拟滚动因多表分组布局会产生 N 个固定高度滚动容器 + IME 风险被否决，改为“保留全量挂载、降低单行挂载成本”方案（用户确认口径后实施）。

## 修改文件

- `components/semantics-table-config.tsx`（主体重写，668 行）
- `modules/semantics-table.tsx`
- `store/useTableStore.ts`（formTableConfig → tableConfigValidator）
- `utils/getDefaultField.ts`（新增共享纯函数）

## 实现说明

1. **便宜档（消挂载后全表重渲染）**：
   - `onNextStep` step0 在 `nextStep()` 前一次性写入：默认语义类型（getDefaultSemanticType）、日期默认描述（withDateDefaultDesc）、中文名称/别名 tfieldAlias 兜底；无变化不 setFields。第二步挂载首渲染即见最终值。
   - config 的 `useLayoutEffect` 退化为兜底（正常流程 no-op）；删除新增模式 setTimeout(200ms) 补写。
   - 编辑模式 `initForm` 内合并兜底归一化（原 updateBizNameOrAlias/setBizNameOrAlias 删除），挂载后仅一次 setFields。
   - `getSemanticTypeLabel`（往表单写 label 字符串的视觉冗余）删除；select 由 store value 经 option 匹配显示同一文案。
2. **去 Form.Item 化（降单行挂载成本）**：
   - 新增 `SemanticTextCell`/`SemanticTypeCell`（均 memo）：本地 state 即时回显 + 300ms 防抖写 store（formatField 口径不变）；外部写入（编辑回显/AI帮填/日期默认描述/主键联动）经 value ≠ lastWritten 判别后同步，防抖回写不打断输入。
   - 容器沿用 `ant-form-item mb0` 类名做纯布局，错误态用 `status="error"` 红框 + `ant-form-item-explain-error` 同样式说明文字复现；`data-field-type`/`data-field-index` 保留供 scrollToErrorField 定位。
   - memo + 稳定回调（useCallback）：任意一次 store 写入只有受影响单元格重渲染，其余 4N 控件全部跳过。
3. **store 级保存校验**：
   - store 槽位 `formTableConfig` 替换为 `tableConfigValidator`（config 挂载时注册、卸载时置 null）。
   - 校验器：表中文名（tableHeader）仍由 form.validateFields 校验；字段级规则与原 Form.Item rules 一致：required（bizName/alias 按显示原值，空格串能过）、maxLength 50/200/500、semanticType 非空；显示原值由各单元格上报到 displayValuesRef（与改前表单值同口径）。
   - 错误展示：校验器写入 saveErrors 状态 → 单元格红框+说明文字；单元格编辑/语义类型变更/AI帮填后清除对应 key。首个错误 key 返回给 onNextStep → scrollToErrorField，行为与改前一致。
4. **纯函数下沉 utils/getDefaultField.ts**：DATE_SEMANTIC_DEFAULT_DESC、withDateDefaultDesc、getSemanticTypeByFieldType、getDefaultSemanticType（原 handleSemanticsShow，含主键映射），config 与 semantics-table 共用，逻辑未改。

## 行为等价性

- 校验规则、提示文案、实时校验（onChange）+ 保存全量校验、滚动定位、主键联动、AI帮填、日期默认描述、编辑回显、保存报文（streamlinedData/assembleData 取 store）全部保持。
- 已知边缘差异（均为改善或极罕见）：① 多处错误时首个定位按 store 索引序（改前按表单项注册序），仍是真实错误；② select 改前 `borderColor: text===''` 是死代码（dataIndex=gender 永远 undefined），已删；③ 空格串 required 口径保持一致（校验显示原值）。
- 打字链路变轻：改前每次敲键 form.setFieldValue → notify 遍历 4N 表单项；现在只更新单元格本地 state + 防抖写 store。

## 测试记录

- `npx tsc --noEmit`（过滤 data-table-meaning）：本次四个文件零错误；残留报错（semantics-table.tsx L119/120/309、index.tsx L100、routes.ts L689）均为存量/其它任务改动。
- `git diff --stat`：改动限定 data-table-meaning 目录 4 个文件。
- UI 验证需登录环境：建议用之前卡死的大数据集验证①「下一步」耗时；②默认语义类型/日期默认描述；③编辑回显；④清空必填项保存报错（红框+说明文字+滚动定位）；⑤AI帮填后单元格同步；⑥主键单选联动；⑦表中文名必填校验。

## 本轮经验

- antd 大表单的挂载成本大头是 rc-field-form Field 注册/订阅；去 Form.Item 化（本地 state + 防抖写 store + 保存时 store 级校验）可在不改布局/滚动/校验覆盖范围的前提下把单行挂载成本降到约 1/3，且任意写入只重渲染受影响单元格。
- 区分“防抖回写”与“外部写入”用 lastWrittenRef 比对 store 回流值，避免受控输入被自己触发的异步写入打断。
- 默认值/兜底归一化应在步骤切换前写入 store，而不是挂载后补写，可消除挂载后的同步全表重渲染。

---

# 撤回记录（2026-09-04）：性能优化全部撤回，仅保留日期默认描述自动填充

## 背景

用户实测第二轮改造后速度达标，但决定将全部性能优化撤回、改天再做，仅保留 2026-09-03 需求「日期语义类型字段描述为空时自动填充默认描述」。

## 执行内容

1. 撤回前先存优化版备份（改天重做时可直接恢复）：
   - `backup-optimized/`：4 个文件的第二轮优化版完整源码（首次 `git diff` 存补丁时被沙箱拦截产生空文件，后从 IDE 本地历史按标记检索恢复：config 含 SemanticTextCell、store/table 含 tableConfigValidator、utils 含 withDateDefaultDesc）。
   - `optimizations-backup.patch`：HEAD 基线 vs backup-optimized 的完整 diff（git diff --no-index 生成）。
2. `git checkout --` 将 data-table-meaning 目录 4 个文件（semantics-table-config.tsx、semantics-table.tsx、useTableStore.ts、getDefaultField.ts）还原到 HEAD。
3. 在 HEAD 原始代码上重挂日期默认描述功能（仅改 semantics-table-config.tsx，+61/-21）：
   - 顶部常量 `DATE_SEMANTIC_DEFAULT_DESC` + 纯函数 `withDateDefaultDesc`（描述为空才填、有值不覆盖）。
   - 4 个挂点与 2026-09-03 已验收版本一致：① initForm 编辑回显；② gender 列 render 默认赋值分支就地填充（同步 record.fieldDesc、newFields、form.setFieldValue，保持就地修改不引入额外渲染 pass）；③ 语义类型 onChange（含主键单选联动对被顶掉主键的字段同样联动）；④ AI帮填 nextSemanticType 联动。

## 测试记录

- `npx tsc --noEmit`（过滤 data-table-meaning）：semantics-table-config.tsx 零错误；残留报错（semantics-table.tsx L118/119/305/367/368、index.tsx L100、routes.ts L689）所在文件与 HEAD 完全一致，均为存量基线问题。
- `git status/diff --stat`：改动仅剩 semantics-table-config.tsx 一个文件，其余 3 个文件与 HEAD 一致。
- UI 回归需登录环境：验证新增/编辑模式下日期字段默认描述自动填充、已有描述不被覆盖、主键联动与 AI帮填后的联动。

## 说明

- 撤回后大数据量「下一步」卡顿回到 HEAD 基线水平（结构性根因仍在：4N 个 Form.Item 挂载、渲染期逐行写 store、O(N²) 表单写入等，详见上文两轮记录）。
- 本 run 上两轮的实现说明与经验保留，作为改天重做的方案依据；重做时优先从 backup-optimized/（或 optimizations-backup.patch）恢复而非从零实施。注意 backup-optimized 是第二轮终态，第一轮 A+B+C 已被第二轮覆盖包含。
