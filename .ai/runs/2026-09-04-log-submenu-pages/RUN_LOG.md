# 日志管理子菜单（访问记录/操作记录）本地落地与 404 排查 Run Log

## 基本信息

- 日期：2026-09-04
- 任务名称：log-submenu-pages
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-03 追加三）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test、Regression
- 任务类型：新功能续做（子路由 + 页面壳）+ 缺陷定位
- 前置记录：`.ai/runs/2026-09-03-log-management-route/RUN_LOG.md`

## 需求摘要

平台已配置「日志管理」两个子菜单：访问记录（路由地址 `access`）、操作记录（路由地址 `action`）。补齐本地静态子路由、页面组件与 i18n 文案；随后排查「访问记录可进入、操作记录 404」问题。

## 影响范围

- `apps/abi/src/pages/log/access/index.tsx`：访问记录列表页（登录日志 logininfor）
- `apps/abi/src/pages/log/action/index.tsx`：操作记录列表页（操作日志 operlog）
- `apps/abi/src/service/api/log.ts`：新增 `getOperLogListApi`（`/api/abi-system/operlog/list`）、`getLoginInforListApi`（`/api/abi-system/logininfor/list`）
- `apps/abi/src/router/elegant/imports.ts`：pages 增 `log_access` / `log_action` 映射（清理重复插入项）
- `apps/abi/src/router/elegant/routes.ts`：`log` 条目补静态 children（access / action）
- `apps/abi/src/types/elegant-router.d.ts`：清理 LastLevelRouteKey 中重复的 `log_access` / `log_action`
- `apps/abi/src/locales/langs/zh-cn/route.ts`、`en-us/route.ts`：增 `log_access` / `log_action` 文案

## 实现说明

- 两个列表页结构对齐 `space/space-role`：`abi-searchbar`（SearchFilterBar：关键字 + 时间范围 + 状态）→ `abi-data-area`（工具栏 + 圆角表格容器 + `data-source-pagination` 自定义分页）。按需求去掉新增、批量删除、行勾选与卡片/列表切换，工具栏仅保留 `ViewControls hideViewToggle`（列设置）。
- 接口响应包装沿用 `getSpaceRoleListApi` 模式：把若依 `{ rows, total }` 包成 `{ data: { data, total } }` 供 `useTable` 默认 transformer 消费。
- 分页为服务端分页：翻页/改页大小走 `tableProps.pagination.onChange` → `updateSearchParams({ pageNum, pageSize })`；总数取接口 `total`（space-role 的客户端二次切片仅因其接口一次返回全量，不适用于日志接口，未照搬）。
- 时间范围走若依标准 `params[beginTime]` / `params[endTime]`（`YYYY-MM-DD HH:mm:ss`）；关键字操作记录用 `operName`、访问记录用 `userName`；状态 `status`（0 正常/成功、1 异常/失败）。
- 操作类型列按若依字典渲染（0 其它…9 清空数据）；状态列复用 `abi-status-tag status-normal/status-disabled` 样式。
- 联调后按实际返回对齐列：访问记录列为 `userName/ipaddr/status/msg/accessTime`（接口无 loginLocation/browser/os，时间字段为 `accessTime`）；操作记录 `status`、`businessType` 实际为数字，渲染统一 `String()` 后比较/查字典。
- 操作记录「系统模块」列省略：`scroll={{ x: 'max-content' }}` 下 antd `ellipsis` 不生效，改为 `ATooltip` + 限宽 div（maxWidth 160）手动截断（照 `effect-review` 既有模式）；两页均移除 `scroll x: max-content` 消除横向撑宽。
- 操作记录高级筛选按接口文档补齐：`title`（LIKE 输入框）、`businessType`（精确下拉）、`operIp`（LIKE 输入框）；`businessTypes`（IN 多选）与 `businessType` 二选一，未接入。
- 时间筛选与其余筛选行为统一（选值暂存、点「查询」单次提交）：`DeferredRangePicker` 的「查询后才提交草稿」语义与 `handleQuery` 先同步调 `onQuery` 的顺序叠加会产生双请求竞态（见下节），故两页改用 `ADatePicker.RangePicker` 且 `onChange` 仅 `setDateRange`（不发请求），时间参数只由 `handleSearch` 在查询点击时随其余条件一次性提交。
- 静态 meta 不写 icon：dynamic 模式下菜单图标取自后端 `meta.icon`，平台配置的 `Rollback` / `activity` 走图标兜底链路，与本地静态路由无关。
- viewKey 规则为全路径段下划线拼接，故 `/log/access` → `log_access`、`/log/action` → `log_action`，必须与 `imports.ts` 的 pages key 严格一致。

## 缺陷定位：操作记录 404

### 现象

菜单可点击，URL 为 `http://localhost:9527/log/action%20`（末尾 `%20`），页面 404；访问记录正常。

### 根因

平台「操作记录」菜单的路由地址末尾带一个空格（`action `）。dynamic 模式下链路：

1. `normalizeRoutePath`（`apps/abi/src/utils/router.ts`）不对 path 做 trim → `path: 'action '`，fullPath = `/log/action `
2. `fullPathToViewKey` 按段拼接 → viewKey = `log_action `（带空格）
3. `component = 'view.log_action '`，`imports.ts` 的 key 是 `log_action` → `getViewName` 抛 `View component not found`
4. `transformElegantRouteToReactRoute` 的 catch 吞掉异常并 `return {}`，该子路由在 react-router 树中成为空节点；但 simple-router 的 matcher 已注册它，因此菜单可点、URL 可跳转，最终匹配不到页面 → 404

本地静态配置两个子路由完全对称，非代码问题。

### 处置

用户在平台菜单管理中修正路由地址为 `action`（去除末尾空格），前端不改代码。曾评估在 `normalizeRoutePath` 增加 `trim()` 作为兜底，因属共享工具函数、影响全部动态菜单，本轮未实施。

## 缺陷定位：时间筛选需点两次查询才生效

### 现象

选时间后点「查询」：表格 loading 闪一下、数据与总数不变；网络面板可见带时间参数的请求正确返回；再点一次「查询」才生效。其他筛选一次即生效。

### 根因

`DeferredRangePicker` 的提交时机是「查询按钮点击后的 effect」，而 `SearchFilterBar.handleQuery` 先同步执行 `onQuery()`：

1. `handleSearch` 读到过期 `dateRange` state → `updateSearchParams` 发请求 A（旧/空时间，全量扫描慢）
2. 渲染后 picker 的 queryNonce effect 提交草稿 → `onChange` → `updateSearchParams` 发请求 B（新时间，结果集小、返回快）
3. B 先返回、A 后返回并覆盖 → 表格停留在全量数据；第二次点查询时 `dateRange` 已提交，A/B 均带时间 → 表现正常

`updateSearchParams`（`packages/hooks/src/use-table.ts`）为 `Object.assign` merge + 每次调用立即 `getData()`，故任何「onQuery 同步发一次 + 延迟提交再发一次」的组合都会竞态。

### 处置

两页时间控件换为 `ADatePicker.RangePicker`，`onChange` 仅 `setDateRange`（选择时只暂存 state、不发请求），时间参数由 `handleSearch` 在点击「查询」时随其余条件一次性提交（单请求、一次生效），与下拉/输入筛选行为完全一致；`handleReset` 显式清空时间参数与 state。曾尝试「onChange 即时发请求 + handleSearch 不重发」方案，因与用户期望的「点查询才生效」交互不符而回退。

## 测试记录

### 执行的命令

- `pnpm typecheck`（apps/abi），按文件名/行范围过滤本次改动

### 测试结果

- `log_access` / `log_action` / `pages/log` / routes.ts 的 log 块 / imports.ts 新增行：零错误。
- 列表页与 `service/api/log.ts` 落地后再次 typecheck：`pages/log/**`、`service/api/log` 零错误。
- 仅剩仓库既有历史错误（`en-us|zh-cn/route.ts` 第 8 行 `'app-workshop'` 不在 `Record<I18nRouteKey, string>` 中、routes.ts 的 component_* 历史块类型不匹配、imports.ts 的 icon-selector/editor-quill 历史类型不匹配），与本次改动无关。
- 运行时验证：平台配置修正后由用户侧确认 `/log/access`、`/log/action` 均可进入；列表数据联调待用户侧验证。

### 失败和修复过程

- `imports.ts` 与 `elegant-router.d.ts` 在两轮之间已被追加过 `log_access` / `log_action`，本轮编辑造成重复项，已删除重复对（保留既有改动，未回滚）。

## 回归检查

- 访问记录路由与页面不受影响（`log_access` 键唯一，viewKey 匹配正常）。
- `log` 一级路由、下拉入口、VerticalMenu 标签延续上一轮实现，未改动。
- 静态 `log` children 在 dynamic 模式下不参与转换（无 hideInMenu、不在子应用白名单），不影响既有路由注册。

## 发现的问题

- 后端菜单 path 原样透传，路由地址首尾空格会导致 viewKey 不匹配、页面静默 404，且控制台仅有 `Error transforming route` 一条日志，排查成本高。

## 本轮经验

- dynamic 模式下排查菜单 404，先看浏览器地址栏是否含 `%20`：若有，优先怀疑平台菜单「路由地址」字段带空格，而非本地 pages 映射缺失。
- 决定性证据是控制台的 `Error transforming route "<name>": Error: View component "<viewKey>" not found`，其中 viewKey 会原样暴露多余空格。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可选：`.ai/context/MODULE_MAP.md` 补充 log 模块（access / action 两个页面壳）。
- 可选：`.ai/context/AI_DEVELOPMENT_RULES.md` 增补「平台菜单路由地址不得含首尾空格」的配置约束提示。

### 需要更新的 prompts / agents / skills / mcp / checklists

- 可选：`.ai/checklists/BEFORE_CODING.md` 增补一条「动态菜单新增页面时，核对平台路由地址与本地 viewKey 完全一致（含空白字符）」。

## 后续建议

- 若联调发现后端不支持 `params[beginTime]/params[endTime]` 或 `operName`/`userName` 关键字，改为前端过滤或按后端实际参数名调整。
- 若后续仍频繁出现菜单配置空白字符问题，再评估在 `normalizeRoutePath` 增加 `trim()` 兜底。

## 未解决问题

- 无（两个列表接口已提供并接入：operlog/list、logininfor/list）。
