# Run Log：全站搜索栏统一改造（SearchFilterBar）

## 基本信息

- 日期：2026-07-22
- 任务名称：unified-search-filter-bar
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Qoder Agent
- 涉及 agent：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：UI 统一改造 / 组件抽取

## 需求摘要

将 abi 应用中「更多空间、工作台、组件」下所有列表页的搜索/筛选栏统一改造为「搜索输入框（flex-1 占满一行）+ 高级筛选按钮」模式：

- 高级筛选按钮参考 kggraph 图谱探索工具栏按钮样式（玻璃态 + FilterOutlined），并加「高级筛选」文字
- 除主搜索输入框外的所有筛选条件（下拉、时间范围）收进高级筛选 Popover 面板，一行两个，底部重置/查询按钮，风格参考 kggraph 高级搜索面板
- 开始时间/结束时间统一改为一个 `ADatePicker.RangePicker`（双日历弹出），去掉 `showTime`，精度到天
- 排除范围：大屏（screen-manage）、本体网络知识图谱探索（ontology-kg/kggraph）不改

## 影响范围

- 新增共享组件 `apps/abi/src/components/SearchFilterBar.tsx`（+ `SearchFilterBar.module.css`）
- 更多空间、工作台（assistant-manage / data-preparation / job / ontology-kg）、组件（applications / data / system）下共 20+ 个列表页的搜索栏区域
- 不涉及后端接口变更；data-source / data-table-meaning 的时间参数语义由「精确时刻」调整为「整天」（startOf/endOf day）

## 修改文件

新增：

- `apps/abi/src/components/SearchFilterBar.tsx` — 共享组件：SearchFilterBar / SearchFilterField / getFilterPopupContainer
- `apps/abi/src/components/SearchFilterBar.module.css` — 按钮玻璃态、520px 面板、字段标签、重置/查询按钮样式

修改（按模块）：

- 更多空间与工作坊：
  - `apps/abi/src/pages/space-list/index.tsx`
  - `apps/abi/src/pages/app-workshop/my-collect/index.tsx`
  - `apps/abi/src/pages/app-workshop/my-share/index.tsx`
  - `apps/abi/src/pages/app-workshop/recently-used/index.tsx`
- 工作台：
  - `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx`
  - `apps/abi/src/pages/workbench/data-preparation/data-collection/index.tsx`
  - `apps/abi/src/pages/workbench/data-preparation/data-source/index.tsx`
  - `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/index.tsx`
  - `apps/abi/src/pages/workbench/job/time/index.tsx`
  - `apps/abi/src/pages/workbench/job/log/index.tsx`
  - `apps/abi/src/pages/workbench/job/email/index.tsx`
  - `apps/abi/src/pages/workbench/ontology-kg/relation/index.tsx`
  - `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx`
  - `apps/abi/src/pages/workbench/ontology-kg/technical-jargon/index.tsx`
  - `apps/abi/src/pages/workbench/ontology-kg/recommended-inquiries/index.tsx`
  - `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionSearchBar.tsx`
  - `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeSearchBar.tsx`
- 组件：
  - `apps/abi/src/pages/component/applications/api-key/index.tsx`
  - `apps/abi/src/pages/component/data/data-dictionary/index.tsx`
  - `apps/abi/src/pages/component/data/effect-review/index.tsx`
  - `apps/abi/src/pages/component/system/model/modules/model-card-list.tsx`
  - `apps/abi/src/pages/component/system/plugin/index.tsx`
  - `apps/abi/src/pages/component/system/skills/index.tsx`
  - `apps/abi/src/pages/component/system/tools/index.tsx`

## 实现说明

- **SearchFilterBar API**：`searchValue`/`onSearchChange`/`searchPlaceholder`（受控输入）、`searchSlot`（Form.Item 场景自定义输入插槽）、`filters`（面板内容，`grid grid-cols-2` 一行两个）、`onQuery`/`onReset`；`filters` 为空时不渲染高级筛选按钮（纯搜索页输入框独占一行）。
- **getFilterPopupContainer**：把面板内 Select/RangePicker 下拉挂到 `.ant-popover-inner`，避免点选下拉时 Popover 意外关闭。
- **Form 场景模式**（job/time、job/email、effect-review、EntitySearch、api-key）：外层 `AForm style={{ display: 'contents' }}` 包裹 SearchFilterBar，主输入用 `searchSlot` 内 Form.Item；Form context 可穿透 Popover Portal，面板内 Form.Item 正常收集值。
- **job/log**：原本无关键字输入，`searchSlot` 用空 `<div className="flex-1 min-w-0" />` 占位，lastSendTime 与 status 全部进面板。
- **job/email**：批量删除按钮保留在搜索行右侧；原 KeySearch 里的 jobOptions useMemo 移入父页面。
- **时间精度**：data-source / data-table-meaning 向后端提交 `YYYY-MM-DD HH:mm:ss`，改为 `dateRange[0].startOf('day')` / `dateRange[1].endOf('day')` 保证结束日期含当天。
- **遗留**：job 下三个 `modules/key-search.tsx` 已无引用但文件未删（保守处理，避免超范围改动）。

## 测试记录

### 执行的命令

- `pnpm --dir apps/abi typecheck`（= `tsc --noEmit --skipLibCheck`）

### 测试结果

- typecheck exit 1，但逐条核对输出：所有错误均为**预存在问题**，来自 build/config、build/plugins、packages/hooks、packages/materials、packages/simple-router、packages/uno-preset（react/lodash 声明缺失、vite 5/6 类型冲突）及少量与本次无关的旧页面。
- 本次改动的 20+ 文件中，输出仅出现两条且均为预存在错误（见「发现的问题」）；`SearchFilterBar.tsx` 及其余改造文件无任何类型错误。
- 未运行 Vitest：本次为纯 UI 结构改造，无对应单测覆盖搜索栏；仓库现有测试不涉及被改文件。

### 失败和修复过程

- job/log 曾产生重复的 `@/constants/job` import 行，已合并为一行。
- job/email、relation 替换后残留未使用导入（KeySearch、ReloadOutlined/SearchOutlined），已清理。

## 回归检查

- 各页查询/重置逻辑保持原 handler（handleSearch/handleReset 或 searchProps.search/reset），仅 UI 承载位置变化。
- 实时搜索页（technical-jargon、recommended-inquiries、data-dictionary、plugin、model-card-list）保持 onChange 即查询语义。
- kggraph 与 screen-manage 未触碰。
- data-collection 的 dateRange 原本就未参与查询参数，保持原状仅 UI 改造。

## Review 结果

重点确认：未改动任何请求参数结构（除 startOf/endOf day 精度语义）、无分号风格文件未引入分号、自动导入组件（AButton/AInput/ADatePicker 等）未重复手动 import。

## 发现的问题

以下为预存在类型错误，与本次改动无关，未修复：

- `job/log/index.tsx` L41：`updateSearchParams({ jobId })` 类型不含 jobId
- `job/email/index.tsx` L167：`form.setFieldsValue({ jobName })` 类型不含 jobName
- `technical-jargon` L58 / `recommended-inquiries` L50：`setGroupId(id)` string→number
- `api-key/index.tsx` L241：`spaceList().then((res))` res 隐式 any
- `skills/index.tsx` L166：批量删除 `selectedRowKeys.map(id => ...)` Key→string|number
- monorepo 基础设施（packages/hooks、materials、simple-router、uno-preset、build/*）大量声明缺失/版本冲突错误

## 本轮经验

- grep 匹配行会丢失前导缩进，SearchReplace 前必须 Read 实际代码段。
- Popover 面板内的 antd 下拉必须用 getPopupContainer 挂到 `.ant-popover-inner`，否则点击下拉会关闭面板。
- AForm `display: contents` + searchSlot 是在不破坏 Form 收集的前提下复用共享搜索栏的可行方案。

## 是否需要更新 AI 系统

### 需要更新的 context

建议在 `.ai/context/MODULE_MAP.md` 或 CODE_STYLE 中登记 `SearchFilterBar` 为列表页搜索栏统一组件，后续新页面应直接复用。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

可考虑新增「列表页搜索栏接入 SearchFilterBar」SOP（含 Form 场景与实时搜索场景两种模式）。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

- 删除已无引用的 `workbench/job/*/modules/key-search.tsx` 三个文件（另起任务确认后删除）。
- 逐步修复上文列出的预存在类型错误，使 `pnpm --dir apps/abi typecheck` 可作为门禁。

## 未解决问题

- typecheck 因大量基础设施预存在错误无法作为绿色门禁；本次通过逐条比对确认无新增错误。

---

## 第二轮补充改动（2026-07-22）

### 需求摘要

用户复查后指出多页面仍缺高级筛选/时间筛选，或输入框未占满一行：

1. 更多空间（space-list）：加高级筛选 + 时间筛选
2. 我的对话三页（my-collect / my-share / recently-used）：加高级筛选 + 时间筛选
3. 属性建模（label-meaning）内维度建模 / 标签语义：加高级筛选；维度建模、指标建模、标签语义均加时间筛选
4. 标签语义（TagSearch）输入框占满一行
5. 实体语义（EntitySearch）输入框占满一行
6. 实体语义 + 关系配置（relation）加时间筛选
7. 定时任务（job/time）输入框占满一行
8. 调度日志（job/log）原无输入框，新增任务名称输入框
9. 邮件记录（job/email）输入框占满一行 + 加时间筛选

### 修改文件

- `apps/abi/src/pages/space-list/index.tsx` — 加时间范围 filters + 本地 dateRange + reset 清空
- `apps/abi/src/pages/app-workshop/my-collect/index.tsx`、`my-share/index.tsx`、`recently-used/index.tsx` — 同上
- `apps/abi/src/pages/workbench/ontology-kg/label-meaning/module/TagSearch.tsx` — 去掉固定 `16rem` 输入框，整体改用 SearchFilterBar（占满一行）+ 时间筛选
- `.../label-meaning/components/dimension-modeling/components/DimensionSearchBar.tsx` — 加时间范围 filters + 本地 dateRange
- `.../label-meaning/components/metric-modeling/components/KnowledgeSearchBar.tsx` — 加时间范围 filters + 本地 dateRange
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx` — 加时间范围 filters（宽度问题由全局 CSS 修复）
- `apps/abi/src/pages/workbench/ontology-kg/relation/index.tsx` — 加时间范围 filters + 本地 dateRange
- `apps/abi/src/pages/workbench/job/log/index.tsx` — searchSlot 从空占位改为 jobName 输入框
- `apps/abi/src/pages/workbench/job/email/index.tsx` — filters 从单个任务状态改为「状态 + 时间范围」
- `apps/abi/src/styles/scss/table.scss` — 新增 `.abi-search-row > .ant-form-item` 规则，统一修复 inline Form.Item 不拉伸

### 关键实现决策

- **inline Form.Item 宽度**：实体语义 / 定时任务 / 邮件记录「未占满一行」的根因是 antd `.ant-form-inline .ant-form-item`（特异性 0,2,0）覆盖了工具类 `.flex-1`（0,1,0）。用一条全局 CSS `.abi-search-row > .ant-form-item { flex: 1 1 0%; min-width: 0; margin-inline-end: 0; margin-bottom: 0; }` 一次性修复，面板内 Form.Item 因被 Popover portal 移出 `.abi-search-row` 不受影响。
- **标签语义占满一行**：TagSearch 原用固定 `width: 16rem` 的 AInput，须改造为 SearchFilterBar 才能占满一行。
- **时间筛选 UI-only 策略**：space-list / 我的对话三页 / EntitySearch / relation / job/email / TagSearch / DimensionSearchBar / KnowledgeSearchBar 对应列表 API（spaceList、fetchOperateNewList、getTagList、fetchEmailList 等）不接受时间参数，统一采用本地 `dateRange` state + RangePicker，仅在 onReset 清空，不提交后端，避免发送无法解析的参数。

### 测试记录

- `pnpm --dir apps/abi typecheck` exit 1，逐条核对：输出错误全部为预存在问题（routes.ts、locales route.ts 的 app-workshop key、NewCreateUser.tsx、SpaceCollection.tsx、job/email L167 setFieldsValue、job/log L40 updateSearchParams 等）。
- 用 `git diff --unified=0` 核对 job/email、job/log 的改动 hunk 均只覆盖 import / dateRange state / 搜索栏区域，未触及报错所在的 useEffect（email L167、log L40），确认这些为预存在错误。
- 本轮 12 个改动文件（含 table.scss）均未引入任何新类型错误。

### 回归检查

- 各页原查询/重置 handler 保持不变，仅新增本地 dateRange state 与时间范围字段。
- job/log 新增 jobName 透传到 fetchJobLogList（已确认该 API 透传 params）。
- kggraph 与 screen-manage 仍未触碰。

---

## 第三轮补充改动（2026-07-22）

### 需求摘要

组件模块：模型管理、效果评估加时间筛选。

### 修改文件

- `apps/abi/src/pages/component/system/model/modules/model-card-list.tsx` — SearchFilterBar 新增 `filters` 时间范围（复用已有本地 dateRange state，onReset 已清空），并补导 SearchFilterField / getFilterPopupContainer。
- `apps/abi/src/pages/component/data/effect-review/index.tsx` — 新增本地 dateRange state + handleReset 清空 + filters 审核状态后加时间范围。

### 关键实现决策

- 两处时间筛选均沿用 UI-only 策略：model-card-list 为客户端过滤（filteredModels）无时间字段；effect-review 的 fetchEffectReviewList body 仅接受 chatMode/page/pageSize/question/spaceId/status，不接受时间参数。故统一用本地 dateRange state，仅在 onReset 清空，不提交后端。

### 测试记录

- `pnpm --dir apps/abi typecheck`：model-card-list.tsx / effect-review/index.tsx 自身无类型错误；仅 routes.ts 的 component_data_effect-review 路由 key 预存在错误（与本次无关）。
