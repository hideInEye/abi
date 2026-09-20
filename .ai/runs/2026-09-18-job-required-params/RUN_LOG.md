# 调度中心列表接口必填参数补齐（联调 252:9203）

## 基本信息

- 日期：2026-09-18
- 任务名称：job-required-params
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（定时任务重构接入 XXL-JOB 调度中心接口）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：联调缺陷修复

## 需求摘要

直连 252:9203 联调后用户回传两个接口真实返回：`/jobgroup/list` 正常（信封 `{code,msg,data:{offset,pagesize,data,total},success}`，与现有 `resolveJobPageResult` 解析一致）；`/jobinfo/list` 报 `Required request parameter 'name' for method parameter type String is not present`。后端沿用 XXL-JOB 约定：列表筛选参数为必填，空值也要传。

## 影响范围

- `apps/abi/src/service/api/job.ts` 的 `fetchJobInfoList`、`fetchJobLogList` 参数封装
- `apps/abi/src/service/api/job.test.ts` 契约断言同步
- 不影响页面层、mock 层（mock 过滤对空串/0 语义为不过滤）

## 修改文件

- `apps/abi/src/service/api/job.ts`
- `apps/abi/src/service/api/job.test.ts`

## 实现说明

- `fetchJobInfoList`：`name`/`executorHandler`/`author` 缺省补空串、`triggerStatus` 缺省补 `'-1'`，保证必填参数始终存在。
- `fetchJobLogList`：`jobId` 缺省补 0（XXL-JOB 语义 0=全部）、`logStatus` 缺省 `'-1'`、`filterTime` 无范围时补空串（原先为空会被 axios 省略，触发同类必填报错）。
- 契约测试更新既有断言并新增两个"缺省补默认值"用例。

## 测试记录

### 执行的命令

- `pnpm test -- apps/abi/src/service/api/job.test.ts apps/abi/src/service/api/job-mock.test.ts apps/abi/src/pages/workbench/job/utils.test.ts`
- `npx tsc --noEmit -p tsconfig.json`（apps/abi 下，过滤 api/job）

### 测试结果

- Vitest 3 个文件全部通过（含新增 2 个默认参数用例）。
- tsc 对 `job.ts`/`job.test.ts` 无错误。

### 失败和修复过程

无。

## 回归检查

- 信封解析 `resolveJobPageResult` 已按 `data.data`/`data.total` 解析，与用户回传的真实返回一致，未改动。
- mock 开关关闭时走真实请求；开启时 mock 对空串/0 过滤语义不变。
- 日志页级联（执行器→任务）调用 `fetchJobInfoList({jobGroup,pageNum,pageSize})` 现在也会带全必填参数。

## Review 结果

改动仅限两个列表函数的参数默认值与测试断言，无业务逻辑变化。

## 发现的问题

后端必填筛选参数与"省略即不过滤"的常见 REST 约定不同，联调期需以前端补默认值适配；若后端后续改为可选参数，本默认值仍兼容。

## 本轮经验

XXL-JOB 系接口列表筛选参数为 Spring 必填参数，前端封装层必须为每个筛选参数提供"不过滤"默认值（空串/0/-1），不能依赖省略键。

## 是否需要更新 AI 系统

均不需要。

## 后续建议

联调中如再出现 `Required request parameter ...` 报错，按同模式在 API 封装层补默认值，不改页面层。

## 未解决问题

无。
