# 2026-07-23 修复三个页面的时间筛选无效

## 目标
修复 ABI 前端（apps/abi）中三个页面「时间范围」筛选点击查询后无反应的问题：
- 助手编排（assistant-manage/assistant-config）
- 维度建模（ontology-kg/.../dimension-modeling/DimensionModeling）
- 数据集（data-preparation/data-collection）

## 根因
1. **助手编排**：`ADatePicker.RangePicker` 是死控件，`dateRange` 从未参与过滤，`pagedList` 直接 slice 全量 `agents`。
2. **维度建模**：已用前端过滤 + `DeferredRangePicker`，但过滤字段写成 `'createTime'`，而数据只有必填的 `updateTime`（`createTime` 可选且通常缺失）。`filterByCreateTime` 在字段缺失时放行全部行，表现为无反应。
3. **数据集**：`ADatePicker.RangePicker` 是死控件，`dateRange` 从未参与过滤，表格/卡片直接用 `tableProps.dataSource`。

判定与 ISO 时间格式（`2026-07-20T14:15:11`）无关：`dayjs()` 可正常解析带 T 的 ISO 8601。

## 修改（统一镜像已上线的 manage/role/index.tsx 前端过滤 + 客户端分页模式）
- **DimensionModeling.tsx**：过滤字段 `'createTime'` → `'updateTime'`。
- **assistant-config/index.tsx**：
  - 引入 `DeferredRangePicker`、`filterByCreateTime`；
  - 新增 `filteredAgents = filterByCreateTime(agents, dateRange, 'createTime')`，`totalCount`/`pagedList` 改用过滤结果；
  - 重置到第一页的 effect 依赖加入 `dateRange`；
  - `ADatePicker.RangePicker` → `DeferredRangePicker`（点击查询才生效）。
- **data-collection/index.tsx**：
  - 引入 `DeferredRangePicker`、`filterByCreateTime`；
  - 新增 `filteredData = filterByCreateTime(tableProps.dataSource, dateRange, 'createTime')`，`totalCount` 改为 `filteredData.length`，新增客户端 `pagedData`；
  - 卡片与表格 `dataSource` 改用 `pagedData`；
  - `DeferredRangePicker` 的 `onChange` 提交时 `updateSearchParams({ pageNum: 1 })` 回到第一页。

## 验证
- GetProblems 检查三文件：仅 DimensionModeling.tsx L107 存在**既有且无关**的类型错误（`Group.onGroupId` number/string 不匹配），非本次改动引入，未处理。
- 未新增类型/编译错误。

## 回归说明
- 三页均改为客户端过滤 + 客户端分页，与 role/index.tsx 一致；这些列表接口按既定约定返回全量数据。
- `filterByCreateTime` 对缺失/非法时间字段放行，故当后端确无对应时间字段时筛选自然无效（属数据侧问题，非前端逻辑）。

## 追加修改（第二轮："点击查询不再调接口" + 维度渲染 bug）
用户反馈：1）维度卡片"创建时间: -"是渲染错误；2）已改前端筛选，但点击查询仍在调接口。据此三页统一为「全量加载 + 纯前端过滤 + 客户端分页」，查询/重置/换页均不再请求接口。

- **维度建模渲染 bug**：`dimensionModeling.mapper.ts` 的 `mapDimensionFromApi` 从未输出 `createTime` 字段（只输出 `updateTime`），导致卡片 `record.createTime` 为 undefined 显示 `-`。新增 `const createTime = trim(pickFirst(item, ['createTime', 'updateTime'])) || '-'` 并加入返回对象。
- **维度建模去接口**：`useDimensionModeling.ts` 数据已按 `pageSize=100000` 全量拉取；`handleQuery/handleReset` 改为纯前端（仅 set `queryParams`，不再 `fetchTableData`）；`fetchTableData` 的 `bizName/techName` 置空（始终全量）；返回值新增 `queryParams`。`DimensionModeling.tsx` 的 `filteredData` 改为按 `queryParams.bizName`(zhName)+`queryParams.techName`(englishName)+`dateRange('updateTime')` 客户端过滤。
- **助手编排去接口**：`assistant-config/index.tsx` 的 `fetchList` 移除 `appName`（全量拉取）；`handleSearch/handleReset` 不再 `fetchList()`；`filteredAgents` 新增 `keyword`(name) 客户端过滤；回到第一页 effect 依赖加 `keyword`。
- **数据集去接口**：`data-collection/index.tsx` 的 `useTable` `pageSize:10→100000`、`viewName:''`（全量）；新增前端分页状态 `fePage/fePageSize`；`filteredData` 按 `searchValue`(viewName)+`dateRange('createTime')` 客户端过滤；`handleSearch/handleReset`、换页、pageSize、`DeferredRangePicker.onChange` 全部改为操作 `fePage/fePageSize`，移除 `updateSearchParams/searchParams/pagination` 依赖。

## 第二轮验证
- GetProblems：`data-collection/index.tsx` 无错误；维度三文件因 language server 未就绪未能确认，`assistant-config` 编辑后工具报告无语法错误。

## 待关注 / 后续
- 三页均一次性全量加载列表数据，若某接口数据量极大需评估性能（当前按既定约定返回全量）。
- `filterByCreateTime` 对缺失/非法时间字段放行，若助手编排后端未返回 `createTime`（`mapAppToCard` 退化 `'-'`），筛选无效，需后端补字段。
- DimensionModeling.tsx L107 既有类型错误建议单独修复（统一 Group.onGroupId 的 groupId 类型）。
