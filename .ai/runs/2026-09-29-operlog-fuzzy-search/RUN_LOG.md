# 操作记录模糊搜索联调改造 Run Log

## 基本信息

- 日期：2026-09-29
- 任务名称：operlog-fuzzy-search-keyword
- 需求文件：用户口头需求（操作记录页搜索框支持"系统模块 + 操作类型"模糊搜索，验证现有接口能力）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：联调测试改造（小范围功能调整）

## 需求摘要

操作记录页（`apps/abi/src/pages/log/action`）顶部搜索框由"操作人员"改为"系统模块 / 操作类型"关键词搜索；输入关键词（如"删除"）时，同一关键词同时下发 `title`（系统模块）与 `businessType`（操作类型）两个查询参数，由后端对两个字段模糊匹配、任一命中即返回（OR 语义）。目的：先验证现有 `/api/abi-system/operlog/list` 接口是否支持，不支持则由后端补支持。

## 影响范围

- `apps/abi/src/pages/log/action/index.tsx`（搜索框绑定、handleSearch/handleReset 改走参数组装函数）
- `apps/abi/src/pages/log/action/search-params.ts`（新增：参数组装纯函数）
- `apps/abi/src/pages/log/action/search-params.test.ts`（新增：参数映射测试）

接口契约未变：`GET /api/abi-system/operlog/list`。

## 修改文件

- `apps/abi/src/pages/log/action/index.tsx`
- `apps/abi/src/pages/log/action/search-params.ts`
- `apps/abi/src/pages/log/action/search-params.test.ts`

## 实现说明

- 顶部搜索框 `searchOperName` 改为 `searchKeyword`，placeholder 改为"系统模块 / 操作类型"。
- `buildOperLogSearchParams`：关键词 trim 后同时作为 `title`、`businessType` 下发；高级筛选的系统模块（`title`）、操作类型字典值（`businessType`）优先于关键词；`operName` 固定下发空串。
- `handleReset` 统一使用 `EMPTY_OPER_LOG_SEARCH_PARAMS` 重置。
- 原组件内 `timeParams` 移至 `search-params.ts` 复用。

## 测试记录

### 执行的命令

- `pnpm -C apps/abi exec vitest run src/pages/log/action/search-params.test.ts`
- `pnpm -C apps/abi exec tsc --noEmit -p tsconfig.json`（过滤 log\action 相关错误，无输出即通过）

### 测试结果

定向测试 7 个用例全部通过；改动文件无 TS 类型错误。

### 失败和修复过程

- `pnpm --dir apps/abi vitest` 因 pnpm 参数解析失败，改用 `pnpm -C apps/abi exec vitest`。
- 初版 handleSearch 遗漏高级筛选 `searchTitle`/`searchBusinessType`，已修正为"高级筛选优先、关键词兜底"。

## 回归检查

- 高级筛选的 操作时间/操作类型/操作状态/系统模块/主机地址 在 handleSearch 中仍全量下发，未回归。
- 分页、列设置、表格渲染逻辑未改动。
- 空关键词时 `title`/`businessType` 下发空串，后端按无该条件处理（若依风格空串不拼接条件）。

## Review 结果

改动仅限查询参数组装，未触碰接口封装与表格逻辑；测试覆盖关键词双字段下发、高级筛选优先级、时间范围参数与重置常量。

## 发现的问题

现有接口为若依风格：`title` 原生 like 模糊匹配；`businessType` 为 Integer 精确匹配（库中存数字字典值，中文名"删除"等由前端 `BUSINESS_TYPE_MAP` 翻译）。中文关键词直接下发 `businessType` 大概率触发后端类型转换异常或匹配不到记录，OR 模糊匹配需后端支持（如新增 keyword 参数做 `title OR 操作类型名称` 模糊查询）。

## 本轮经验

若依 operlog 接口的"操作类型"是数字字典，`businessType` 传中文无法命中，联调时需让后端明确是否支持中文模糊匹配。

## 是否需要更新 AI 系统

不需要。一次性联调问题，已记录于本 run log。

## 后续建议

- 用户实测后若接口不支持，后端需增加对 `title`/`businessType`（或操作类型名称字段）的 OR 模糊匹配。
- 确认接口能力后，若后端采用新参数（如 `keyword`），前端再调整 `buildOperLogSearchParams` 的参数名即可。

## 未解决问题

- 后端接口是否支持中文关键词模糊匹配操作类型，待用户实测确认。
