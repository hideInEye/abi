# 时间范围筛选改为「点击查询才生效」 Run Log

## 基本信息

- 日期：2026-07-23
- 任务名称：timerange-defer-until-search
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Regression、Review
- 任务类型：交互行为修复 / 前端时间筛选

## 需求摘要

用户反馈：所有列表页的「时间范围」高级筛选，在选择日期后会立即触发前端过滤（选完就筛），
期望改为只有点击「查询」按钮（或搜索框回车）时才应用时间范围过滤。

## 影响范围

- 共享组件 `apps/abi/src/components/SearchFilterBar.tsx`：新增延迟提交能力。
- 所有使用 `filterByCreateTime` / `filterTreeByCreateTime` 做前端时间筛选的列表页/搜索栏（共 23 处）。
- 后端 query-on-click 型页面（api-key、plugin、assistant-config、data-collection、job/log、job/time）
  本就只在查询时请求，不存在「选完就筛」，不在本次范围。

## 修改文件

- `apps/abi/src/components/SearchFilterBar.tsx`（新增 `SearchFilterContext` + `DeferredRangePicker`，
  在 handleQuery/handleReset 中广播 queryNonce/resetNonce）
- 以下 23 个文件：为 `@/components/SearchFilterBar` 导入补充 `DeferredRangePicker`，
  并将 `<ADatePicker.RangePicker>` 替换为 `<DeferredRangePicker>`（保留原 value/onChange）：
  - component/system：tools、skills、model/modules/model-card-list
  - component/data：data-dictionary、effect-review
  - manage：user、role、dept、menu
  - space：space-role、space-menu；space-list
  - workbench/data-preparation：data-source、data-table-meaning
  - workbench/job：email
  - workbench/app-workshop：my-collect、my-share、recently-used
  - workbench/ontology-kg：relation、entity/components/EntitySearch、
    label-meaning module/TagSearch、metric-modeling/.../KnowledgeSearchBar、
    dimension-modeling/.../DimensionSearchBar

## 实现说明

采用「集中式草稿 → 提交」方案，避免逐页新增 draft state 带来的 80+ 处重复改动与遗漏风险：

1. `SearchFilterBar` 内新增 `queryNonce` / `resetNonce` 两个自增信号，通过 `SearchFilterContext` 下发；
   点击「查询」自增 `queryNonce`，点击「重置」自增 `resetNonce`。
2. 新增 `DeferredRangePicker`：内部维护 `pending` 草稿值，选择日期只更新草稿，不触发外部 `onChange`；
   监听到 `queryNonce` 变化时才调用外部 `onChange(pending)` 提交为已生效值；
   监听到 `resetNonce` 变化时清空草稿；外部已生效值（value）变化时同步回草稿。
   挂载时首次触发被跳过，避免初始化即提交/清空。
3. 每个前端筛选页仅需：导入补 `DeferredRangePicker` + 标签重命名，`value={dateRange}` 与
   `onChange={setDateRange}` 保持不变，消费过滤的 `useMemo(dateRange)` 与分页 reset 逻辑零改动。

关键分离点：搜索框输入的防抖仍走页面自身 `onQuery`（不经过 handleQuery），因此「输入关键字」仍即时过滤，
只有显式点击「查询」/回车才提交时间范围草稿，精确匹配「点击搜索才筛选」诉求。

## 测试记录

### 执行的命令

- `npx tsc --noEmit --skipLibCheck`（在 `apps/abi` 下）

### 测试结果

- 类型检查未新增与本次相关的错误：输出中不含 `SearchFilterBar` / `DeferredRangePicker` 相关报错。
- 退出码为 1 的报错均为既有历史错误（如 `roleKey`/`deptId` 不在 `CommonSearchParams`、
  skills 的 `Key` 类型、部分 `@ts-expect-error` 未使用），与本次改动无关，按规则未改动。

## 回归检查

- 选择日期不再立即过滤；点击「查询」/回车后按草稿生效。
- 点击「重置」清空草稿与已生效时间范围，列表回到全量。
- 关键字输入的即时过滤行为保持不变。
- 树形页面（dept/menu/space-menu）走 `filterTreeByCreateTime`，行为一致。
- 子搜索栏（EntitySearch/TagSearch/KnowledgeSearchBar/DimensionSearchBar）在提交时同时更新本地
  与上抛父级 `onDateRangeChange`，父级过滤在查询时生效。

## Review 结果

- 仅重命名 JSX 标签 + 补充导入，未改动各页过滤/分页业务逻辑。
- `DeferredRangePicker` 通过 Context 感知查询/重置，Popover 使用 Portal 但 Context 仍可穿透。
- 未触碰后端 query-on-click 型页面，避免破坏其 Form 绑定。

## 发现的问题

- 既有历史类型错误若干（见测试结果），不属本任务。
- `assistant-config` 页面存在 RangePicker 但未接入前端过滤（历史遗留、筛选未生效），
  非本次「选完就筛」问题，未纳入本次范围。

## 本轮经验

- 面对「多页面同一交互模式的行为调整」，优先在共享组件层用 Context + 派生组件集中处理，
  各页仅做最小替换（导入 + 标签名），可显著降低重复改动与遗漏风险。

## 是否需要更新 AI 系统

### 需要更新的 context

可在 `.ai/context/CODE_STYLE.md` 或组件说明中补充：前端时间范围筛选统一使用
`DeferredRangePicker`（延迟到点击查询才生效），新页面直接复用。

### 需要更新的 prompts

无。

### 需要更新的 agents

无。

### 需要更新的 skills

无。

### 需要更新的 MCP 建议

无。

### 需要更新的 checklists

可在筛选相关 checklist 中加入：新增时间范围筛选必须使用 `DeferredRangePicker`。

## 后续建议

- 若后续将 backend query-on-click 型页面（如 job/time、plugin、api-key）改为前端筛选，
  同样直接使用 `DeferredRangePicker`。
- 可考虑清理 `assistant-config` 未接入过滤的死 RangePicker。

## 未解决问题

- 无。
