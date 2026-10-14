# 操作记录模糊搜索改走后端 searchValue Run Log

## 基本信息

- 日期：2026-10-10
- 任务名称：operlog-search-value
- 需求文件：用户口头需求（后端已部署 `searchValue` 字段，前端切换为单关键词下发）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：Bug fix + 接口联调（小范围参数调整）

## 需求摘要

`2026-09-29-operlog-fuzzy-search` 把同一个中文关键词同时下发到 `title` 与 `businessType`。后端 `SysOperLog.businessType` 是 `Integer`，Spring 参数绑定收到中文时抛 `NumberFormatException` → `BindException`，接口直接报错；即便不报错，mapper 里 `title like` 与 `business_type =` 是 AND 关系，也拿不到 OR 语义。

后端已部署新增 `searchValue` 字段，由后端对「系统模块名」和「操作类型」做 OR 模糊匹配。本次前端把关键词从 `title`/`businessType` 迁到 `searchValue`。

## 影响范围

- `apps/abi/src/pages/log/action/search-params.ts`（参数组装）
- `apps/abi/src/pages/log/action/index.tsx`（`apiParams` 初始值）
- `apps/abi/src/pages/log/action/search-params.test.ts`（测试用例同步）

接口地址未变：`GET /api/abi-system/operlog/list`。访问记录页（`pages/log/access`）未涉及。

## 修改文件

- `apps/abi/src/pages/log/action/search-params.ts`
- `apps/abi/src/pages/log/action/index.tsx`
- `apps/abi/src/pages/log/action/search-params.test.ts`

## 实现说明

- `buildOperLogSearchParams`：关键词 trim 后只下发 `searchValue`；`title` 恢复为仅高级筛选值，`businessType` 恢复为仅字典值（`??` 兜底空串），二者不再被关键词污染。
- 关键词与高级筛选之间由后端按 AND 组合，关键词内部为 OR。
- `EMPTY_OPER_LOG_SEARCH_PARAMS` 与 `index.tsx` 的 `apiParams` 补 `searchValue: ''`，保证首屏与重置后参数结构一致（`useTable.updateSearchParams` 是 `Object.assign` 合并语义，缺字段会残留上一次的值）。

## 测试记录

### 执行的命令

- `pnpm -C apps/abi exec vitest run src/pages/log/action/search-params.test.ts`
- `pnpm -C apps/abi exec tsc --noEmit -p tsconfig.json`（过滤 `pages\log\action`，无输出即通过）

### 测试结果

定向测试 7 个用例全部通过；改动文件无 TS 类型错误。

新增回归用例：`businessType 只接受字典值，关键词不得注入（后端为 Integer 类型）`，防止后续再次把中文塞进 Integer 参数。

### 失败和修复过程

无。

## 回归检查

- 高级筛选的 操作时间/操作类型/操作状态/系统模块/主机地址 仍全量下发，未回归。
- 分页、表格渲染、`handleReset` 逻辑未改动，重置常量已含 `searchValue`。
- 空关键词时 `searchValue` 下发空串，后端按无该条件处理。

## Review 结果

改动仅限查询参数组装与初始值，未触碰接口封装与表格逻辑。

## 发现的问题

无。

## 本轮经验

若依风格接口里，前端"一个关键词塞多个字段"的 OR 模糊搜索做法不可行：字段类型不一致（varchar vs Integer）会直接触发参数绑定异常，且 mapper 里多条件是 AND 语义。跨字段模糊必须由后端提供单一 keyword 参数在 SQL 层做 OR。

## 是否需要更新 AI 系统

需要。已把该结论沉淀为长期记忆（common_pitfalls_experience），避免其他列表页重复踩坑。

## 后续建议

- 后端联调时验证：中文关键词命中操作类型（如"删除" → `business_type=3`）、关键词与高级筛选 AND、关键词无匹配时返回空列表且不报错。

## 未解决问题

无。
