# 前端创建时间筛选统一改造 — 运行记录

日期：2026-07-23
计划文件：`前端创建时间筛选统一改造_9b178a5d.md`

## 目标

把各列表页的时间筛选统一改为**真正的前端 `createTime`（或等价展示时间字段）过滤 + 前端分页**，移除昨天遗留的 UI-only（不生效）时间控件与提交后端的时间参数。树表改为递归过滤保留层级。

## 共享工具

`apps/abi/src/utils/date.ts`
- `filterByCreateTime(rows, dateRange, field='createTime')`：按时间字段落在 `[start.startOf('day'), end.endOf('day')]` 内过滤；`dateRange` 为空、字段缺失或非法时间时**放行**（graceful no-op），故字段不存在也不会破坏页面。
- `filterTreeByCreateTime`：递归过滤，节点自身或任一子孙命中即保留，保持父子层级。

## 已完成改造（前端筛 + 前端分页 / 递归过滤）

### 系统管理 + 空间管理（t1–t7）
| 页面 | 类型 | 处理 |
| --- | --- | --- |
| `manage/user/index.tsx` | flat | createTime 前端筛 + slice 分页 |
| `manage/role/index.tsx` | flat | 同上 |
| `space/space-role/index.tsx` | flat | 同上 |
| `manage/menu/index.tsx` | 树表 | `filterTreeByCreateTime` 递归过滤 |
| `manage/dept/index.tsx` | 树表 | 递归过滤 |
| `space/space-menu/index.tsx` | 树表 | 递归过滤 |
| `space/space-user/index.tsx` | flat | 补「成员类型」(otype) 高级筛选；按需求不加时间筛（成员数据无 createTime） |

### 昨天遗留页面（t8）
| 页面 | 时间字段 | 数据源 | 处理 |
| --- | --- | --- | --- |
| `app-workshop/my-collect/index.tsx` | recentlyUseTime | 全量 rows | filterByCreateTime + slice；翻页移除重新请求 |
| `app-workshop/recently-used/index.tsx` | recentlyUseTime | 全量 rows | 同上 |
| `app-workshop/my-share/index.tsx` | sharedTime | rows | 同上（后端传了 pageNumber/pageSize，按全量假设处理，见风险） |
| `workbench/job/email/index.tsx` | sendTime | useTable 全量 | filterByCreateTime + slice，`{...tableProps}` 后覆盖 dataSource |
| `data-preparation/data-table-meaning/index.tsx` | createTime | useTableStore 全量 | 移除后端 startTime/endTime，改前端筛 tableSchemaList |
| `data-preparation/data-source/index.tsx` | createTime | useTable 全量 | 移除后端时间参数，前端筛 + slice，list/card 双视图 |
| `component/data/effect-review/index.tsx` | create_time | useTable 全量 | 前端筛(snake_case 字段) + slice，list/card 双视图 |
| `component/system/model/modules/model-card-list.tsx` | createTime | models prop | 折入已有前端分页 filteredModels |
| `ontology-kg/label-meaning/.../TagSearch.tsx` + `SemanticTag.tsx` | createTime | 全量 tagList | TagSearch 上抛 dateRange，父组件 filterByCreateTime 过滤后交 TagTable（TagTable 自带前端分页） |

## 原后端分页页面改造（大 pageSize 拉全量 + 前端筛 + 前端分页）

以下 5 个页面原为**真正的后端分页**（请求携带 `pageNum/pageSize`，读取后端 `total`，翻页触发 refetch）。按用户指令「都把值改大」，统一改为：请求后端 `pageSize=100000`（space-list 用 `FETCH_ALL_PAGE_SIZE` 常量）一次性拉取全量数据 → 前端 `filterByCreateTime` 按 `createTime` 过滤 → 前端 `slice` 分页；SearchBar 子组件新增 `onDateRangeChange` 把时间区间上抛父组件。改造后与其余页面模式一致，前端时间筛选真正生效（不再是「只筛当前页」）。

| 页面 | 实现方式 |
| --- | --- |
| `space-list/index.tsx` | 加 `FETCH_ALL_PAGE_SIZE=100000`；移除 `total` state 改用派生 `displayTotal`；`filteredSpaceData`/`pagedSpaceData`；所有 `fetchSpaceData` 调用 pageSize→大值、翻页移除 refetch |
| `ontology-kg/relation/index.tsx` (useRelationManagement) | `INITIAL_PAGINATION.pageSize→100000`；`filteredRelations`/`pagedRelations` + `handleFePageChange`；RelationTable 用分页后数据 |
| `ontology-kg/entity/index.tsx` (EntitySearch, useEntityManagement) | `INITIAL_PAGINATION.pageSize→100000`；EntitySearch 加 `onDateRangeChange`；`filteredEntities`/`pagedEntities` |
| `.../dimension-modeling` (DimensionSearchBar, useDimensionModeling) | `initialPagination.pageSize→100000`；DimensionSearchBar 加 `onDateRangeChange`；`filteredData`/`pagedData` |
| `.../metric-modeling` (KnowledgeSearchBar, useKnowledgeExtraction) | `initialPagination.pageSize→100000`；KnowledgeSearchBar 加 `onDateRangeChange`；`filteredData`/`pagedData`（保留 `pagination` 供 canCreateCustom 用） |

## 校验（t9）

- `pnpm --dir apps/abi typecheck`：退出码非 0，但**所有报错均为预存在基线错误**，与本次改造无关：
  - `packages/*`（use-table / materials / simple-router / uno-preset）：`Cannot find module 'react'` 等环境/依赖解析问题。
  - `apps/abi` 内错误集中在未改动文件（如 `manage/post`、`role-auth`、`user-role`、`group`、`routes.ts`、`semantics-table.tsx` 等），及本次改动文件的**未改动区域**（如 `CommonSearchParams` 的 deptId/roleKey、`Unused @ts-expect-error`、render 参数隐式 any、`SemanticTag` 的 `handleGroupChange` 签名不匹配）。
  - 逐一比对 git diff hunk 行号与 `git show HEAD` 确认：本次编辑文件的报错行均落在未改动区域或 HEAD 已存在，**本次改造未新增任何类型错误**。
- 编辑后的 t8 文件经 GetProblems / typecheck 过滤确认无新增报错。

## 手动回归建议（待人工执行）

1. 设置时间范围后，列表按创建时间过滤，"共 X 条"与分页随过滤联动。
2. 重置清空时间恢复全量；名称/状态搜索仍正常。
3. 树表（菜单/部门）过滤后父子层级完整。
4. list/card 双视图（data-source / effect-review）过滤与分页一致。

## 假设与风险

- **全量假设**：useTable / 无参列表接口返回全量数据（分页参数被忽略），已在 user 列表实测确认。若个别接口实际为真分页，该页前端筛会退化为"只筛当前页"。
- `my-share` 后端携带 pageNumber/pageSize，若其为真分页则同样有此风险，需人工确认。
- 无 `createTime` 字段的页面改用展示时间字段（sendTime/sharedTime/recentlyUseTime/create_time）；filterByCreateTime 对缺失字段放行。
- **大 pageSize 方案（space-list / relation / entity / dimension / metric）**：依赖后端接受 `pageSize=100000` 并一次性返回全量数据。前提是这些表数据量有限（空间/关系/实体/维度/指标通常为管理型少量数据）；若未来某表数据量激增，需改为后端时间区间查询或虚拟滚动，否则单次请求与前端渲染会有性能压力。
- typecheck：`DimensionModeling.tsx` 的 `handleGroupChange(groupId: number)` 与 `onGroupId(groupId: string)` 签名不匹配为 **HEAD 预存在基线错误**（本次仅位移行号，未修复以免超范围改行为）。
